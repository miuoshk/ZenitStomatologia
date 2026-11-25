"use server";

import {
  OCCUPANCY_LABELS,
  messageForDomainError,
  occupancyErrorMessage,
  parseZlotyToGrosze,
} from "@crux/i18n";
import {
  closeDay,
  copyDayFrom,
  recordOccupancy,
  recordOccupancyRange,
  reopenDay,
  voidOccupancy,
} from "@crux/scheduling";
import type { Actor, Tx } from "@crux/db";
import type { DomainError, Result } from "@crux/shared/result";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";

export type OccupancyActionState =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string };

function fail(error: DomainError): OccupancyActionState {
  const details = (error.details ?? {}) as { code?: unknown; reason?: unknown };
  const code = typeof details.code === "string" ? details.code : undefined;
  const reason = typeof details.reason === "string" ? details.reason : undefined;
  return {
    ok: false,
    message:
      occupancyErrorMessage(code) ?? occupancyErrorMessage(reason) ?? messageForDomainError(error),
  };
}

async function run<T>(
  fn: (tx: Tx, actor: Actor) => Promise<Result<T, DomainError>>,
  successMessage: (value: T) => string,
): Promise<OccupancyActionState> {
  const actor = await requireActor();
  try {
    const result = await getDb().withActor(actor, (tx) => fn(tx, actor));
    if (!result.ok) return fail(result.error);
    revalidatePath("/oblozenie");
    return { ok: true, message: successMessage(result.value) };
  } catch {
    return { ok: false, message: OCCUPANCY_LABELS.error };
  }
}

export type RecordInput = {
  commandId: string;
  chairId: string;
  day: string;
  fromHour: number;
  /** Koniec wyłącznie; = fromHour + 1 dla pojedynczej godziny. */
  toHour: number;
  category: string;
  amount: string;
  note: string;
  overrideReason: string;
};

export async function recordOccupancyAction(input: RecordInput): Promise<OccupancyActionState> {
  const grosze = parseZlotyToGrosze(input.amount);
  if (grosze === undefined) return { ok: false, message: OCCUPANCY_LABELS.invalidAmount };
  if (input.toHour <= input.fromHour) return { ok: false, message: OCCUPANCY_LABELS.invalidRange };
  return run<unknown>(
    async (tx, actor) => {
      const common = {
        commandId: input.commandId,
        locationId: actor.activeLocationId,
        chairId: input.chairId,
        day: input.day,
        category: input.category,
        amountGrosze: grosze === null ? null : BigInt(grosze),
        note: input.note.trim() === "" ? null : input.note,
        overrideReason: input.overrideReason.trim() === "" ? null : input.overrideReason,
      };
      if (input.toHour - input.fromHour === 1) {
        return recordOccupancy(tx, actor, { ...common, hour: input.fromHour });
      }
      return recordOccupancyRange(tx, actor, {
        ...common,
        fromHour: input.fromHour,
        toHour: input.toHour,
      });
    },
    () => OCCUPANCY_LABELS.saved,
  );
}

export async function voidOccupancyAction(input: {
  commandId: string;
  entryId: string;
  reason: string;
}): Promise<OccupancyActionState> {
  return run(
    (tx, actor) => voidOccupancy(tx, actor, input),
    () => OCCUPANCY_LABELS.voided,
  );
}

export async function copyDayAction(input: {
  commandId: string;
  fromDay: string;
  toDay: string;
}): Promise<OccupancyActionState> {
  return run(
    (tx, actor) => copyDayFrom(tx, actor, { ...input, locationId: actor.activeLocationId }),
    (v) => OCCUPANCY_LABELS.copied(v.copied, v.skipped),
  );
}

export async function closeDayAction(input: {
  commandId: string;
  day: string;
}): Promise<OccupancyActionState> {
  return run(
    (tx, actor) => closeDay(tx, actor, { ...input, locationId: actor.activeLocationId }),
    () => OCCUPANCY_LABELS.closeSummary,
  );
}

export async function reopenDayAction(input: {
  commandId: string;
  day: string;
  reason: string;
}): Promise<OccupancyActionState> {
  return run(
    (tx, actor) => reopenDay(tx, actor, { ...input, locationId: actor.activeLocationId }),
    () => OCCUPANCY_LABELS.saved,
  );
}
