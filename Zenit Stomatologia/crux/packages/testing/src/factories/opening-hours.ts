import type { Actor, Tx } from "@crux/db";
import { setOpeningHours } from "@crux/org";

export type OpeningHoursParams = { weekday: number; opens: string; closes: string };

/** ISO: 1=pon … 7=niedz. Pon–Pt 8–20, sob 8–14, niedziela zamknięte (brak wiersza). */
export function openingHoursFactory(
  overrides: Partial<Record<number, OpeningHoursParams | null>> = {},
): OpeningHoursParams[] {
  const base: Record<number, OpeningHoursParams | null> = {
    1: { weekday: 1, opens: "08:00", closes: "20:00" },
    2: { weekday: 2, opens: "08:00", closes: "20:00" },
    3: { weekday: 3, opens: "08:00", closes: "20:00" },
    4: { weekday: 4, opens: "08:00", closes: "20:00" },
    5: { weekday: 5, opens: "08:00", closes: "20:00" },
    6: { weekday: 6, opens: "08:00", closes: "14:00" },
    7: null,
    ...overrides,
  };
  return Object.values(base).filter((v): v is OpeningHoursParams => v !== null);
}

export async function persistOpeningHours(
  tx: Tx,
  actor: Actor,
  locationId: string,
  validFrom: string,
  rows: OpeningHoursParams[] = openingHoursFactory(),
): Promise<void> {
  for (const row of rows) {
    const r = await setOpeningHours(tx, actor, { locationId, validFrom, ...row });
    if (!r.ok) throw new Error(`persistOpeningHours: ${JSON.stringify(r.error)}`);
  }
}
