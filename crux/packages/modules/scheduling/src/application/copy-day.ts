import type { Actor, Tx } from "@crux/db";
import { chairOccupancy } from "@crux/db/schema";
import { ok, type DomainError, type Result } from "@crux/shared/result";
import { TZ, PlainDateSchema, systemClock, type Clock } from "@crux/shared/time";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assertEditable,
  atomic,
  authorizeWrite,
  dayRangeSql,
  idempotent,
  loadActiveChairs,
  loadOpeningWindow,
  parseInput,
  writeEntry,
} from "./common";

export const CopyDayFromInput = z.object({
  commandId: z.uuid(),
  locationId: z.uuid(),
  fromDay: PlainDateSchema,
  toDay: PlainDateSchema,
});
export type CopyDayFromInput = z.input<typeof CopyDayFromInput>;

/**
 * Kopiuje wykonawców i kategorie z innego dnia — bez kwot i notatek.
 * Pomija godziny zajęte, zablokowane, poza godzinami otwarcia i nieistniejące.
 */
export async function copyDayFrom(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ copied: number; skipped: number }, DomainError>> {
  const parsed = parseInput(CopyDayFromInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const authz = await authorizeWrite(tx, actor, input.locationId, undefined);
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.copyDayFrom", async () => {
    const editable = await assertEditable(tx, actor, input.locationId, input.toDay);
    if (!editable.ok) return editable;
    const window = await loadOpeningWindow(tx, actor, input.locationId, input.toDay);
    if (!window.ok) return window;

    const activeChairs = new Set(
      (await loadActiveChairs(tx, actor, input.locationId)).map((c) => c.id),
    );

    const source = await tx
      .select({
        chairId: chairOccupancy.chairId,
        providerId: chairOccupancy.providerId,
        category: chairOccupancy.category,
        hour: sql<number>`extract(hour from lower(${chairOccupancy.period}) at time zone ${TZ}::text)::int`,
      })
      .from(chairOccupancy)
      .where(
        and(
          eq(chairOccupancy.tenantId, actor.tenantId),
          eq(chairOccupancy.locationId, input.locationId),
          isNull(chairOccupancy.voidedAt),
          sql`${chairOccupancy.period} && ${dayRangeSql(input.fromDay)}`,
        ),
      );

    let copied = 0;
    let skipped = 0;
    for (const row of source) {
      if (!activeChairs.has(row.chairId)) {
        skipped += 1;
        continue;
      }
      const r = await atomic(tx, (sp) =>
        writeEntry(
          sp,
          actor,
          clock,
          input.commandId,
          window.value,
          {
            locationId: input.locationId,
            chairId: row.chairId,
            providerId: row.providerId,
            day: input.toDay,
            hour: row.hour,
            category: row.category,
            amountGrosze: null,
            note: null,
            overrideReason: null,
          },
          "insert_only",
        ),
      );
      if (r.ok) copied += 1;
      else skipped += 1;
    }
    return ok({ copied, skipped });
  });
}
