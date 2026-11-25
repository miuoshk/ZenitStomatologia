import type { Actor, Tx } from "@crux/db";
import { closeDay } from "@crux/scheduling";
import { newId } from "@crux/shared/id";
import type { DomainError, Result } from "@crux/shared/result";

export type DayClosureParams = { day: string };

export function dayClosureFactory(day: string): DayClosureParams {
  return { day };
}

export async function persistDayClosure(
  tx: Tx,
  actor: Actor,
  locationId: string,
  params: DayClosureParams,
): Promise<Result<unknown, DomainError>> {
  return closeDay(tx, actor, { commandId: newId(), locationId, ...params });
}
