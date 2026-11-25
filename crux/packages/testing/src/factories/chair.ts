import type { Actor, Tx } from "@crux/db";
import { createChair } from "@crux/org";
import type { DomainError, Result } from "@crux/shared/result";

export type ChairParams = { name: string; position: number; equipment: string[] };

export function chairFactory(position: number, overrides: Partial<ChairParams> = {}): ChairParams {
  return { name: `Fotel ${String(position)}`, position, equipment: [], ...overrides };
}

export async function persistChair(
  tx: Tx,
  actor: Actor,
  locationId: string,
  params: ChairParams,
): Promise<Result<{ id: string }, DomainError>> {
  return createChair(tx, actor, { locationId, ...params });
}
