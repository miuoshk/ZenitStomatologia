import type { Actor, Tx } from "@crux/db";
import { chairOccupancy, chairs, occupancyDayClosures, timeBlocks } from "@crux/db/schema";
import { authorize } from "@crux/identity";
import { getOpeningHours } from "@crux/org";
import { findCommand, getSetting, publishEvent, recordCommand } from "@crux/platform";
import { mapPgError } from "@crux/shared/errors";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { TZ, hourRange, instantFromIso, type Clock, type PlainDate } from "@crux/shared/time";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import {
  OccupancyEntry,
  isDayClosed,
  isHourWithinWindow,
  type OccupancyContext,
} from "../domain/chair-occupancy";

export type OpeningWindow = { closed: boolean; opens: string | null; closes: string | null };

export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): Result<z.infer<S>, DomainError> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  const field = parsed.error.issues[0]?.path.join(".") ?? "input";
  return err({ type: "validation", details: { field, code: "schema" } });
}

export function validation(field: string, code: string): DomainError {
  return { type: "validation", details: { field, code } };
}

class AbortWrite extends Error {
  constructor(readonly domainError: DomainError) {
    super("abort_write");
  }
}

/**
 * Savepoint: błąd domenowy albo konflikt (EXCLUDE 23P01 / unique) cofa tylko tę część
 * i wraca jako `Result`, bez zatruwania transakcji wywołującego.
 */
export async function atomic<T>(
  tx: Tx,
  fn: (sp: Tx) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await tx.transaction(async (sp) => {
      const r = await fn(sp);
      if (!r.ok) throw new AbortWrite(r.error);
      return r;
    });
  } catch (error) {
    if (error instanceof AbortWrite) return err(error.domainError);
    const mapped = mapPgError(error);
    if (!mapped.ok && mapped.error.type !== "technical") return err(mapped.error);
    throw error;
  }
}

/** Idempotencja komend: powtórzony `commandId` zwraca zapisany wynik. */
export async function idempotent<T>(
  tx: Tx,
  actor: Actor,
  commandId: string,
  name: string,
  run: () => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  const found = await findCommand(tx, actor, commandId);
  if (!found.ok) return found;
  if (found.value) return ok(found.value.result as T);
  const result = await run();
  if (result.ok) {
    await recordCommand(tx, actor, { commandId, name, result: result.value });
  }
  return result;
}

/**
 * Czy aktor może zmieniać wpisy dowolnego wykonawcy w gabinecie (recepcja, kierownik, zarząd).
 * Wykonawca (`write_own`, `void`) zmienia i unieważnia wyłącznie własne wpisy (docs/03 §8).
 */
export function canEditAnyEntry(actor: Actor): boolean {
  return (
    actor.permissions.includes("occupancy.write") ||
    actor.permissions.includes("occupancy.write_closed")
  );
}

/** `occupancy.write` albo `occupancy.write_own` (tylko wpisy własnego wykonawcy). */
export async function authorizeWrite(
  tx: Tx,
  actor: Actor,
  locationId: string,
  providerId: string | null | undefined,
): Promise<Result<true, DomainError>> {
  if (
    !actor.permissions.includes("occupancy.write") &&
    actor.permissions.includes("occupancy.write_own") &&
    providerId === actor.staffId
  ) {
    return authorize(tx, actor, "occupancy.write_own", { locationId });
  }
  return authorize(tx, actor, "occupancy.write", { locationId });
}

export async function getOccupancyMode(
  tx: Tx,
  actor: Actor,
  locationId: string,
): Promise<"manual" | "appointments"> {
  const r = await getSetting(tx, actor, "scheduling.occupancy_mode", locationId);
  return r.ok && r.value === "appointments" ? "appointments" : "manual";
}

export async function loadClosure(tx: Tx, actor: Actor, locationId: string, day: PlainDate) {
  const rows = await tx
    .select()
    .from(occupancyDayClosures)
    .where(
      and(
        eq(occupancyDayClosures.tenantId, actor.tenantId),
        eq(occupancyDayClosures.locationId, locationId),
        eq(occupancyDayClosures.day, day),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Edycja ręcznych wpisów: tryb `appointments` blokuje ([F0-010/AC11]);
 * zamknięty dzień wymaga `occupancy.write_closed` ([F0-010/AC5]).
 */
export async function assertEditable(
  tx: Tx,
  actor: Actor,
  locationId: string,
  day: PlainDate,
): Promise<Result<true, DomainError>> {
  if ((await getOccupancyMode(tx, actor, locationId)) === "appointments") {
    return err(validation("occupancyMode", "occupancy_mode_appointments"));
  }
  const closure = await loadClosure(tx, actor, locationId, day);
  if (
    isDayClosed(closure ? { closedAt: closure.closedAt, reopenedAt: closure.reopenedAt } : null) &&
    !actor.permissions.includes("occupancy.write_closed")
  ) {
    return err({ type: "forbidden", details: { reason: "day_closed" } });
  }
  return ok(true);
}

export async function loadChair(
  tx: Tx,
  actor: Actor,
  locationId: string,
  chairId: string,
): Promise<Result<{ id: string; name: string }, DomainError>> {
  const rows = await tx
    .select({ id: chairs.id, name: chairs.name })
    .from(chairs)
    .where(
      and(
        eq(chairs.id, chairId),
        eq(chairs.tenantId, actor.tenantId),
        eq(chairs.locationId, locationId),
        eq(chairs.active, true),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return err({ type: "not_found", details: { entity: "chair" } });
  return ok(row);
}

export async function loadActiveChairs(tx: Tx, actor: Actor, locationId: string) {
  return tx
    .select({ id: chairs.id, name: chairs.name })
    .from(chairs)
    .where(
      and(
        eq(chairs.tenantId, actor.tenantId),
        eq(chairs.locationId, locationId),
        eq(chairs.active, true),
      ),
    );
}

export async function loadOpeningWindow(
  tx: Tx,
  actor: Actor,
  locationId: string,
  day: PlainDate,
): Promise<Result<OpeningWindow, DomainError>> {
  return getOpeningHours(tx, actor, locationId, day);
}

/** Wyrażenie SQL: `tstzrange` całego dnia lokalnego (Europe/Warsaw). */
export function dayRangeSql(day: string) {
  return sql`tstzrange(
    (${day}::date)::timestamp at time zone ${TZ}::text,
    ((${day}::date) + 1)::timestamp at time zone ${TZ}::text
  )`;
}

export async function isChairBlocked(
  tx: Tx,
  actor: Actor,
  chairId: string,
  period: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: timeBlocks.id })
    .from(timeBlocks)
    .where(
      and(
        eq(timeBlocks.tenantId, actor.tenantId),
        eq(timeBlocks.chairId, chairId),
        isNull(timeBlocks.endedAt),
        sql`${timeBlocks.period} && ${period}::tstzrange`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export type WriteEntryInput = {
  locationId: string;
  chairId: string;
  providerId: string | null;
  day: PlainDate;
  hour: number;
  category: string;
  amountGrosze: bigint | null;
  note: string | null;
  overrideReason: string | null;
};

/**
 * Zapis jednej godziny (upsert lub tylko insert) + zdarzenie `occupancy.entry_recorded.v1`.
 * Wywołujący odpowiada za autoryzację, `assertEditable` i savepoint (`atomic`).
 */
export async function writeEntry(
  tx: Tx,
  actor: Actor,
  clock: Clock,
  commandId: string,
  window: OpeningWindow,
  input: WriteEntryInput,
  mode: "upsert" | "insert_only",
): Promise<Result<{ entryId: string; created: boolean }, DomainError>> {
  const period = hourRange(input.day, input.hour);
  const blocked = await isChairBlocked(tx, actor, input.chairId, period);
  const context: OccupancyContext = {
    canOverrideHours: actor.permissions.includes("occupancy.override_hours"),
    isWithinOpeningHours: (_d, h) => isHourWithinWindow(window, h),
    isBlocked: () => blocked,
  };

  const created = OccupancyEntry.create(
    {
      tenantId: actor.tenantId,
      locationId: input.locationId,
      chairId: input.chairId,
      providerId: input.providerId,
      day: input.day,
      hour: input.hour,
      category: input.category,
      amountGrosze: input.amountGrosze,
      note: input.note,
      overrideReason: input.overrideReason,
      createdBy: actor.staffId,
    },
    clock,
    context,
  );
  if (!created.ok) return created;
  const entry = created.value;

  const existing = await tx
    .select({
      id: chairOccupancy.id,
      source: chairOccupancy.source,
      providerId: chairOccupancy.providerId,
    })
    .from(chairOccupancy)
    .where(
      and(
        eq(chairOccupancy.tenantId, actor.tenantId),
        eq(chairOccupancy.chairId, input.chairId),
        isNull(chairOccupancy.voidedAt),
        sql`${chairOccupancy.period} = ${entry.period}::tstzrange`,
      ),
    )
    .limit(1);

  let entryId = entry.id;
  let wasCreated = true;
  const found = existing[0];
  if (found) {
    if (mode === "insert_only" || found.source !== "manual") {
      return err(validation("hour", "chair_occupied"));
    }
    // Wykonawca z samym `write_own` nie nadpisuje cudzego wpisu ([F0-010/AC4], docs/03 §8).
    if (!canEditAnyEntry(actor) && found.providerId !== actor.staffId) {
      return err(validation("hour", "chair_occupied"));
    }
    entryId = found.id;
    wasCreated = false;
    const updated = await tx
      .update(chairOccupancy)
      .set({
        category: entry.category,
        amountGrosze: entry.amountGrosze,
        providerId: entry.providerId,
        note: entry.note,
        overrideReason: entry.overrideReason,
        updatedAt: clock.now(),
        updatedBy: actor.staffId,
      })
      .where(eq(chairOccupancy.id, found.id))
      .returning({ id: chairOccupancy.id });
    // RLS może po cichu odfiltrować UPDATE (0 wierszy) — to odmowa, nie sukces.
    if (updated.length === 0) {
      return err({ type: "forbidden", details: { reason: "entry_not_editable" } });
    }
  } else {
    await tx.insert(chairOccupancy).values({
      id: entry.id,
      tenantId: actor.tenantId,
      locationId: entry.locationId,
      chairId: entry.chairId,
      providerId: entry.providerId,
      period: entry.period,
      category: entry.category,
      amountGrosze: entry.amountGrosze,
      source: "manual",
      overrideReason: entry.overrideReason,
      note: entry.note,
      createdAt: entry.createdAt,
      createdBy: actor.staffId,
    });
  }

  const published = await publishEvent(
    tx,
    actor,
    "occupancy.entry_recorded.v1",
    {
      tenantId: actor.tenantId,
      locationId: input.locationId,
      day: input.day,
      entryId,
      chairId: input.chairId,
    },
    { dedupeKey: `occ-rec:${commandId}:${entryId}` },
  );
  if (!published.ok) return published;

  return ok({ entryId, created: wasCreated });
}

/** `[a,b)` → części (do składania zakresów wielogodzinnych). */
export function splitRange(range: string): [string, string] {
  const [a, b] = range.slice(1, -1).split(",");
  return [a ?? "", b ?? ""];
}

export function rowsOf<T>(result: unknown): T[] {
  return result as T[];
}

export function toInstant(value: string | Date): Date {
  return value instanceof Date ? value : instantFromIso(value);
}
