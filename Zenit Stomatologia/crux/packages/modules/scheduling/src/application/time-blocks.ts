import type { Actor, Tx } from "@crux/db";
import { chairOccupancy, timeBlocks } from "@crux/db/schema";
import { authorize } from "@crux/identity";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { PlainDateSchema, hourRange, systemClock, type Clock } from "@crux/shared/time";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { validateNote } from "../domain/chair-occupancy";
import { atomic, idempotent, loadChair, parseInput, splitRange, validation } from "./common";

export const CreateTimeBlockInput = z.object({
  commandId: z.uuid(),
  locationId: z.uuid(),
  chairId: z.uuid().nullish(),
  staffId: z.uuid().nullish(),
  day: PlainDateSchema,
  /** Pierwsza godzina (włącznie). */
  startHour: z.number().int().min(0).max(23),
  /** Koniec (wyłącznie), 1–24. */
  endHour: z.number().int().min(1).max(24),
  kind: z.string().min(1).max(40),
  note: z.string().nullish(),
});
export type CreateTimeBlockInput = z.input<typeof CreateTimeBlockInput>;

export const EndTimeBlockInput = z.object({
  commandId: z.uuid(),
  blockId: z.uuid(),
});
export type EndTimeBlockInput = z.input<typeof EndTimeBlockInput>;

/** Blokada czasu fotela lub osoby. Nie nakłada się na istniejące wpisy obłożenia. */
export async function createTimeBlock(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = parseInput(CreateTimeBlockInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  if (input.endHour <= input.startHour) return err(validation("endHour", "invalid_range"));
  if (!input.chairId && !input.staffId) {
    return err(validation("chairId", "chair_or_staff_required"));
  }
  const note = validateNote(input.note);
  if (!note.ok) return note;

  const authz = await authorize(tx, actor, "occupancy.write", { locationId: input.locationId });
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.createTimeBlock", async () => {
    if (input.chairId) {
      const chair = await loadChair(tx, actor, input.locationId, input.chairId);
      if (!chair.ok) return chair;
    }
    const [start] = splitRange(hourRange(input.day, input.startHour));
    const [, end] = splitRange(hourRange(input.day, input.endHour - 1));
    const period = `[${start},${end})`;

    if (input.chairId) {
      const overlapping = await tx
        .select({ id: chairOccupancy.id })
        .from(chairOccupancy)
        .where(
          and(
            eq(chairOccupancy.tenantId, actor.tenantId),
            eq(chairOccupancy.chairId, input.chairId),
            isNull(chairOccupancy.voidedAt),
            sql`${chairOccupancy.period} && ${period}::tstzrange`,
          ),
        )
        .limit(1);
      if (overlapping[0]) return err(validation("startHour", "overlaps_entries"));
    }

    return atomic(tx, async (sp) => {
      const rows = await sp
        .insert(timeBlocks)
        .values({
          tenantId: actor.tenantId,
          locationId: input.locationId,
          chairId: input.chairId ?? null,
          staffId: input.staffId ?? null,
          period,
          kind: input.kind,
          note: note.value,
          createdBy: actor.staffId,
        })
        .returning({ id: timeBlocks.id });
      const id = rows[0]?.id;
      if (!id) return err({ type: "invariant", details: { code: "time_block_insert" } });
      return ok({ id });
    });
  });
}

/** Zakończenie blokady (przestaje blokować fotel); wiersz zostaje w historii. */
export async function endTimeBlock(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = parseInput(EndTimeBlockInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const rows = await tx
    .select({ id: timeBlocks.id, locationId: timeBlocks.locationId, endedAt: timeBlocks.endedAt })
    .from(timeBlocks)
    .where(and(eq(timeBlocks.id, input.blockId), eq(timeBlocks.tenantId, actor.tenantId)))
    .limit(1);
  const block = rows[0];
  if (!block) return err({ type: "not_found", details: { entity: "time_block" } });

  const authz = await authorize(tx, actor, "occupancy.write", { locationId: block.locationId });
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.endTimeBlock", async () => {
    if (block.endedAt) return ok({ id: block.id });
    await tx
      .update(timeBlocks)
      .set({ endedAt: clock.now(), endedBy: actor.staffId })
      .where(eq(timeBlocks.id, block.id));
    return ok({ id: block.id });
  });
}
