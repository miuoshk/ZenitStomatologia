import type { Actor, Tx } from "@crux/db";
import { createLocation } from "@crux/org";
import type { DomainError, Result } from "@crux/shared/result";

export type LocationColorKey = "01" | "02" | "03" | "04";

export type LocationParams = {
  number: string;
  name: string;
  address: Record<string, unknown>;
  colorKey: LocationColorKey;
};

/** docs/14: „01 Nowodworska”, „02 Białowieska”; color_key = numer gabinetu. */
export const LOCATION_PRESETS: Readonly<Record<"01" | "02", LocationParams>> = {
  "01": { number: "01", name: "Nowodworska", address: { city: "Białystok" }, colorKey: "01" },
  "02": { number: "02", name: "Białowieska", address: { city: "Białystok" }, colorKey: "02" },
};

export function locationFactory(
  number: "01" | "02" = "01",
  overrides: Partial<LocationParams> = {},
): LocationParams {
  return { ...LOCATION_PRESETS[number], ...overrides };
}

export async function persistLocation(
  tx: Tx,
  actor: Actor,
  params: LocationParams = locationFactory(),
): Promise<Result<{ id: string }, DomainError>> {
  return createLocation(tx, actor, params);
}
