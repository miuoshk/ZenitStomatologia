import { plainDate, type PlainDate } from "@crux/shared/time";

/**
 * Arytmetyka dat kalendarzowych (`YYYY-MM-DD`) bez `Date` (ADR-022): numer dnia od 1970-01-01.
 * Algorytm „days from civil” (H. Hinnant).
 */
export function toEpochDay(iso: string): number {
  const [ys, ms, ds] = iso.split("-");
  const m = Number(ms);
  const d = Number(ds);
  const y = Number(ys) - (m <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromEpochDay(z0: number): PlainDate {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return plainDate(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

export function addDays(iso: string, days: number): PlainDate {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** Dni tygodnia ISO: 0 = poniedziałek … 6 = niedziela. */
export function isoWeekdayIndex(iso: string): number {
  return (((toEpochDay(iso) + 3) % 7) + 7) % 7;
}

export function startOfIsoWeek(iso: string): PlainDate {
  return addDays(iso, -isoWeekdayIndex(iso));
}

/** Ten sam dzień rok wcześniej (29.02 → 28.02). */
export function minusOneYear(iso: string): PlainDate {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys) - 1;
  const m = Number(ms);
  let d = Number(ds);
  if (m === 2 && d === 29) d = 28;
  return plainDate(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

export function startOfMonth(iso: string): PlainDate {
  return plainDate(`${iso.slice(0, 7)}-01`);
}

export function startOfYear(iso: string): PlainDate {
  return plainDate(`${iso.slice(0, 4)}-01-01`);
}

export function dayCount(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from) + 1;
}

/** `2026-10-05` → `05.10`. */
export function shortDatePl(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** `2026-10-05` → `05.10.2026`. */
export function longDatePl(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}
