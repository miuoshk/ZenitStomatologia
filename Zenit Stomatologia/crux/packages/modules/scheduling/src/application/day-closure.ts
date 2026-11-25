import type { Actor, Tx } from "@crux/db";
import { chairOccupancy, occupancyDayClosures } from "@crux/db/schema";
import { authorize } from "@crux/identity";
import { publishEvent } from "@crux/platform";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { PlainDateSchema, systemClock, type Clock } from "@crux/shared/time";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { DayClosure, isDayClosed, type DaySummary } from "../domain/chair-occupancy";
import {
  atomic,
  dayRangeSql,
  idempotent,
  loadActiveChairs,
  loadClosure,
  parseInput,
  validation,
} from "./common";

export const CloseDayInput = z.object({
  commandId: z.uuid(),
  locationId: z.uuid(),
  day: PlainDateSchema,
});
export type CloseDayInput = z.input<typeof CloseDayInput>;

export const ReopenDayInput = CloseDayInput.extend({ reason: z.string().min(1) });
export type ReopenDayInput = z.input<typeof ReopenDayInput>;

/** Zamknięcie dnia: zapisuje podsumowanie `{ hours, amount_grosze, chairs_without_entries }`. */
export async function closeDay(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ summary: DaySummary }, DomainError>> {
  const parsed = parseInput(CloseDayInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const authz = await authorize(tx, actor, "occupancy.close_day", {
    locationId: input.locationId,
  });
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.closeDay", async () => {
    const closure = await loadClosure(tx, actor, input.locationId, input.day);
    if (
      isDayClosed(closure ? { closedAt: closure.closedAt, reopenedAt: closure.reopenedAt } : null)
    ) {
      return err(validation("day", "day_already_closed"));
    }

    const entries = await tx
      .select({ chairId: chairOccupancy.chairId, amountGrosze: chairOccupancy.amountGrosze })
      .from(chairOccupancy)
      .where(
        and(
          eq(chairOccupancy.tenantId, actor.tenantId),
          eq(chairOccupancy.locationId, input.locationId),
          isNull(chairOccupancy.voidedAt),
          sql`${chairOccupancy.period} && ${dayRangeSql(input.day)}`,
        ),
      );
    const chairs = await loadActiveChairs(tx, actor, input.locationId);
    const summary = DayClosure.close(input.locationId, input.day, entries, chairs);

    return atomic(tx, async (sp) => {
      if (closure) {
        await sp
          .update(occupancyDayClosures)
          .set({
            closedAt: clock.now(),
            closedBy: actor.staffId,
            summary,
            reopenedAt: null,
            reopenedBy: null,
            reopenReason: null,
          })
          .where(eq(occupancyDayClosures.id, closure.id));
      } else {
        await sp.insert(occupancyDayClosures).values({
          tenantId: actor.tenantId,
          locationId: input.locationId,
          day: input.day,
          closedAt: clock.now(),
          closedBy: actor.staffId,
          summary,
        });
      }
      const published = await publishEvent(
        sp,
        actor,
        "occupancy.day_closed.v1",
        { tenantId: actor.tenantId, locationId: input.locationId, day: input.day },
        { dedupeKey: `occ-close:${input.commandId}` },
      );
      if (!published.ok) return published;
      return ok({ summary });
    });
  });
}

/** Ponowne otwarcie dnia — wymaga `occupancy.write_closed` i powodu. */
export async function reopenDay(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ day: string }, DomainError>> {
  const parsed = parseInput(ReopenDayInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const authz = await authorize(tx, actor, "occupancy.write_closed", {
    locationId: input.locationId,
  });
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.reopenDay", async () => {
    const closure = await loadClosure(tx, actor, input.locationId, input.day);
    if (!closure || !isDayClosed({ closedAt: closure.closedAt, reopenedAt: closure.reopenedAt })) {
      return err(validation("day", "day_not_closed"));
    }

    return atomic(tx, async (sp) => {
      await sp
        .update(occupancyDayClosures)
        .set({
          reopenedAt: clock.now(),
          reopenedBy: actor.staffId,
          reopenReason: input.reason.trim(),
        })
        .where(eq(occupancyDayClosures.id, closure.id));
      const published = await publishEvent(
        sp,
        actor,
        "occupancy.day_reopened.v1",
        { tenantId: actor.tenantId, locationId: input.locationId, day: input.day },
        { dedupeKey: `occ-reopen:${input.commandId}` },
      );
      if (!published.ok) return published;
      return ok({ day: input.day });
    });
  });
}
