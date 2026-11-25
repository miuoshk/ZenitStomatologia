import type { Actor, Tx } from "@crux/db";
import { chairOccupancy } from "@crux/db/schema";
import { authorize } from "@crux/identity";
import { publishEvent } from "@crux/platform";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { TZ, plainDate, systemClock, type Clock } from "@crux/shared/time";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { OccupancyEntry } from "../domain/chair-occupancy";
import { assertEditable, atomic, canEditAnyEntry, idempotent, parseInput } from "./common";

export const VoidOccupancyInput = z.object({
  commandId: z.uuid(),
  entryId: z.uuid(),
  reason: z.string().min(1),
});
export type VoidOccupancyInput = z.input<typeof VoidOccupancyInput>;

/** Anulowanie wpisu (soft-void) z powodem. Zdarzenie `occupancy.entry_voided.v1`. */
export async function voidOccupancy(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ entryId: string }, DomainError>> {
  const parsed = parseInput(VoidOccupancyInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const rows = await tx
    .select({
      id: chairOccupancy.id,
      locationId: chairOccupancy.locationId,
      chairId: chairOccupancy.chairId,
      providerId: chairOccupancy.providerId,
      voidedAt: chairOccupancy.voidedAt,
      day: sql<string>`to_char(lower(${chairOccupancy.period}) at time zone ${TZ}::text, 'YYYY-MM-DD')`,
    })
    .from(chairOccupancy)
    .where(and(eq(chairOccupancy.id, input.entryId), eq(chairOccupancy.tenantId, actor.tenantId)))
    .limit(1);
  const entry = rows[0];
  if (!entry) return err({ type: "not_found", details: { entity: "occupancy_entry" } });

  const authz = await authorize(tx, actor, "occupancy.void", { locationId: entry.locationId });
  if (!authz.ok) return authz;
  // Wykonawca unieważnia tylko własne wpisy (docs/03 §8: `occupancy.void` = „własne”).
  if (!canEditAnyEntry(actor) && entry.providerId !== actor.staffId) {
    return err({ type: "forbidden", details: { reason: "not_own_entry" } });
  }

  return idempotent(tx, actor, input.commandId, "scheduling.voidOccupancy", async () => {
    const day = plainDate(entry.day);
    const editable = await assertEditable(tx, actor, entry.locationId, day);
    if (!editable.ok) return editable;

    const voided = OccupancyEntry.void(entry, input.reason, clock, actor.staffId);
    if (!voided.ok) return voided;

    return atomic(tx, async (sp) => {
      const updated = await sp
        .update(chairOccupancy)
        .set({
          voidedAt: voided.value.voidedAt,
          voidedBy: actor.staffId,
          voidReason: voided.value.voidReason,
          updatedAt: clock.now(),
          updatedBy: actor.staffId,
        })
        .where(eq(chairOccupancy.id, entry.id))
        .returning({ id: chairOccupancy.id });
      if (updated.length === 0) {
        return err({ type: "forbidden", details: { reason: "entry_not_editable" } });
      }

      const published = await publishEvent(
        sp,
        actor,
        "occupancy.entry_voided.v1",
        {
          tenantId: actor.tenantId,
          locationId: entry.locationId,
          day,
          entryId: entry.id,
          chairId: entry.chairId,
        },
        { dedupeKey: `occ-void:${input.commandId}` },
      );
      if (!published.ok) return published;
      return ok({ entryId: entry.id });
    });
  });
}
