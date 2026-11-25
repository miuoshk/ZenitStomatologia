import type { Actor, Tx } from "@crux/db";
import { createTimeBlock } from "@crux/scheduling";
import { newId } from "@crux/shared/id";
import type { DomainError, Result } from "@crux/shared/result";

export type TimeBlockParams = {
  day: string;
  startHour: number;
  /** wyłącznie */
  endHour: number;
  kind: string;
};

export function timeBlockFactory(
  day: string,
  overrides: Partial<TimeBlockParams> = {},
): TimeBlockParams {
  return { day, startHour: 12, endHour: 14, kind: "serwis", ...overrides };
}

export async function persistTimeBlock(
  tx: Tx,
  actor: Actor,
  where: { locationId: string; chairId: string },
  params: TimeBlockParams,
): Promise<Result<{ id: string }, DomainError>> {
  return createTimeBlock(tx, actor, { commandId: newId(), ...where, ...params });
}
