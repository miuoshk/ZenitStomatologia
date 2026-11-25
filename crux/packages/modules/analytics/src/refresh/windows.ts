import { TZ, plainDate, plusMs, toLocalDay, type Clock, type PlainDate } from "@crux/shared/time";

const HOUR_MS = 3_600_000;

/** Przyrost: ostatnie 48 h (dni lokalne Europe/Warsaw, włącznie z dzisiejszym). */
export function incrementalWindow(clock: Clock, hours = 48): { from: PlainDate; to: PlainDate } {
  const now = clock.now();
  return { from: toLocalDay(plusMs(now, -hours * HOUR_MS), TZ), to: toLocalDay(now, TZ) };
}

/** Pełne odświeżenie: 13 miesięcy kalendarzowych (bieżący + 12 poprzednich) do dziś. */
export function fullWindow(clock: Clock, months = 13): { from: PlainDate; to: PlainDate } {
  const today = toLocalDay(clock.now(), TZ);
  const [ys, ms] = today.split("-");
  const total = Number(ys) * 12 + (Number(ms) - 1) - (months - 1);
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return {
    from: plainDate(`${String(y)}-${String(m).padStart(2, "0")}-01`),
    to: today,
  };
}

/** Pojedynczy dzień (zdarzenia `occupancy.*`): okno = ten dzień. */
export function dayWindow(day: string): { from: PlainDate; to: PlainDate } {
  const d = plainDate(day);
  return { from: d, to: d };
}
