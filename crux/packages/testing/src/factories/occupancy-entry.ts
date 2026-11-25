import type { Actor, Tx } from "@crux/db";
import { recordOccupancy } from "@crux/scheduling";
import { newId } from "@crux/shared/id";
import type { DomainError, Result } from "@crux/shared/result";
import { pickWeighted, randInt, type Rng } from "../generators/rng";
import {
  CATEGORY_AMOUNT_RANGES,
  CATEGORY_WEIGHTS,
  type CategoryKey,
} from "./categories";

export type OccupancyEntryParams = { category: CategoryKey; amountGrosze: bigint };

export function amountFor(rng: Rng, category: CategoryKey): number {
  const [min, max] = CATEGORY_AMOUNT_RANGES[category];
  return min + randInt(rng, 0, Math.floor((max - min) / 100)) * 100;
}

export function occupancyEntryFactory(
  rng: Rng,
  overrides: Partial<OccupancyEntryParams> = {},
): OccupancyEntryParams {
  const category = overrides.category ?? pickWeighted(rng, CATEGORY_WEIGHTS);
  return {
    category,
    amountGrosze: overrides.amountGrosze ?? BigInt(amountFor(rng, category)),
  };
}

export async function persistOccupancyEntry(
  tx: Tx,
  actor: Actor,
  where: {
    locationId: string;
    chairId: string;
    providerId?: string | null;
    day: string;
    hour: number;
  },
  params: OccupancyEntryParams,
): Promise<Result<{ entryId: string; created: boolean }, DomainError>> {
  return recordOccupancy(tx, actor, { commandId: newId(), ...where, ...params });
}
