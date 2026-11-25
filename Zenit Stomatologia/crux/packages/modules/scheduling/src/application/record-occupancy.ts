import type { Actor, Tx } from "@crux/db";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { PlainDateSchema, systemClock, type Clock } from "@crux/shared/time";
import { z } from "zod";
import {
  assertEditable,
  atomic,
  authorizeWrite,
  idempotent,
  loadChair,
  loadOpeningWindow,
  parseInput,
  validation,
  writeEntry,
} from "./common";

const Base = {
  commandId: z.uuid(),
  locationId: z.uuid(),
  chairId: z.uuid(),
  providerId: z.uuid().nullish(),
  day: PlainDateSchema,
  category: z.string().min(1),
  amountGrosze: z.bigint().nullish(),
  note: z.string().nullish(),
  overrideReason: z.string().nullish(),
};

export const RecordOccupancyInput = z.object({
  ...Base,
  hour: z.number().int().min(0).max(23),
});
export type RecordOccupancyInput = z.input<typeof RecordOccupancyInput>;

export const RecordOccupancyRangeInput = z.object({
  ...Base,
  /** Pierwsza godzina (włącznie). */
  fromHour: z.number().int().min(0).max(23),
  /** Koniec zakresu (wyłącznie), 1–24. Kwota dotyczy każdej godziny. */
  toHour: z.number().int().min(1).max(24),
});
export type RecordOccupancyRangeInput = z.input<typeof RecordOccupancyRangeInput>;

function resolveProvider(actor: Actor, providerId: string | null | undefined): string | null {
  if (providerId !== undefined) return providerId;
  // wykonawca z samym `occupancy.write_own` zapisuje wyłącznie siebie
  return actor.permissions.includes("occupancy.write") ? null : actor.staffId;
}

/** Upsert wpisu obłożenia dla fotela i pełnej godziny. */
export async function recordOccupancy(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ entryId: string; created: boolean }, DomainError>> {
  const parsed = parseInput(RecordOccupancyInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  const providerId = resolveProvider(actor, input.providerId);

  const authz = await authorizeWrite(tx, actor, input.locationId, providerId);
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.recordOccupancy", async () => {
    const editable = await assertEditable(tx, actor, input.locationId, input.day);
    if (!editable.ok) return editable;
    const chair = await loadChair(tx, actor, input.locationId, input.chairId);
    if (!chair.ok) return chair;
    const window = await loadOpeningWindow(tx, actor, input.locationId, input.day);
    if (!window.ok) return window;

    return atomic(tx, (sp) =>
      writeEntry(
        sp,
        actor,
        clock,
        input.commandId,
        window.value,
        {
          locationId: input.locationId,
          chairId: input.chairId,
          providerId,
          day: input.day,
          hour: input.hour,
          category: input.category,
          amountGrosze: input.amountGrosze ?? null,
          note: input.note ?? null,
          overrideReason: input.overrideReason ?? null,
        },
        "upsert",
      ),
    );
  });
}

/** Wiele godzin na jednym fotelu — wszystko albo nic (jeden savepoint). */
export async function recordOccupancyRange(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
  clock: Clock = systemClock,
): Promise<Result<{ entryIds: string[] }, DomainError>> {
  const parsed = parseInput(RecordOccupancyRangeInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  if (input.toHour <= input.fromHour) return err(validation("toHour", "invalid_range"));
  const providerId = resolveProvider(actor, input.providerId);

  const authz = await authorizeWrite(tx, actor, input.locationId, providerId);
  if (!authz.ok) return authz;

  return idempotent(tx, actor, input.commandId, "scheduling.recordOccupancyRange", async () => {
    const editable = await assertEditable(tx, actor, input.locationId, input.day);
    if (!editable.ok) return editable;
    const chair = await loadChair(tx, actor, input.locationId, input.chairId);
    if (!chair.ok) return chair;
    const window = await loadOpeningWindow(tx, actor, input.locationId, input.day);
    if (!window.ok) return window;

    return atomic(tx, async (sp) => {
      const entryIds: string[] = [];
      for (let hour = input.fromHour; hour < input.toHour; hour += 1) {
        const r = await writeEntry(
          sp,
          actor,
          clock,
          input.commandId,
          window.value,
          {
            locationId: input.locationId,
            chairId: input.chairId,
            providerId,
            day: input.day,
            hour,
            category: input.category,
            amountGrosze: input.amountGrosze ?? null,
            note: input.note ?? null,
            overrideReason: input.overrideReason ?? null,
          },
          "upsert",
        );
        if (!r.ok) return r;
        entryIds.push(r.value.entryId);
      }
      return ok({ entryIds });
    });
  });
}
