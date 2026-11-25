/**
 * Jedyny plik z `new Date()` / TZDate w monorepo (ADR-022).
 * Domena bierze czas z `Clock`; prezentacja w Europe/Warsaw.
 */
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { z } from "zod";

export const TZ = "Europe/Warsaw" as const;

export type Clock = {
  now(): Date;
};

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Współdzielony zegar systemowy (web / worker). */
export const systemClock: Clock = new SystemClock();

export class FixedClock implements Clock {
  readonly #instant: Date;

  constructor(instant: Date) {
    this.#instant = new Date(instant.getTime());
  }

  now(): Date {
    return new Date(this.#instant.getTime());
  }
}

/** Deserializacja ISO-8601 → `Date` (testy / granice). Domena używa `Clock`. */
export function instantFromIso(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`instantFromIso: nieprawidłowe ISO '${iso}'`);
  }
  return d;
}

/** Przesunięcie chwili o `ms` (jedyny dozwolony sposób poza `Clock.now()`). */
export function plusMs(instant: Date, ms: number): Date {
  return new Date(instant.getTime() + ms);
}

export const PlainDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => isValidPlainDate(value), { error: "nieprawidłowa PlainDate" })
  .brand<"PlainDate">();

/** Kalendarzowa data `YYYY-MM-DD` (bez strefy). */
export type PlainDate = z.infer<typeof PlainDateSchema>;

export function plainDate(value: string): PlainDate {
  return PlainDateSchema.parse(value);
}

function isValidPlainDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new TZDate(y, m - 1, d, 12, 0, 0, 0, "UTC");
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Lokalny dzień kalendarzowy w `tz` dla chwili UTC. */
export function toLocalDay(date: Date, tz: string = TZ): PlainDate {
  const local = new TZDate(date, tz);
  const y = String(local.getFullYear());
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return plainDate(`${y}-${m}-${d}`);
}

/** Początek dnia lokalnego (`00:00:00`) w `tz` jako `Date` (UTC pod spodem). */
export function startOfDayIn(tz: string, day: PlainDate): Date {
  const [ys, ms, ds] = day.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const local = new TZDate(y, m - 1, d, 0, 0, 0, 0, tz);
  return new Date(local.getTime());
}

/**
 * Pełna godzina lokalna jako literał `tstzrange` Postgresa: `[start,end)`.
 * W dniu zmiany czasu (wiosna) godzina 2:00 nie istnieje → zakres zerowy.
 */
export function hourRange(day: PlainDate, hour: number, tz: string = TZ): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`hourRange: godzina ${String(hour)} poza 0–23`);
  }
  const [ys, ms, ds] = day.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);

  const startLocal = new TZDate(y, m - 1, d, hour, 0, 0, 0, tz);
  const endHour = hour + 1;
  const endLocal =
    endHour <= 23
      ? new TZDate(y, m - 1, d, endHour, 0, 0, 0, tz)
      : new TZDate(y, m - 1, d + 1, 0, 0, 0, 0, tz);

  return `[${formatTstz(startLocal)},${formatTstz(endLocal)})`;
}

function formatTstz(local: TZDate): string {
  const offsetMin = -local.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  const y = String(local.getFullYear());
  const mo = String(local.getMonth() + 1).padStart(2, "0");
  const da = String(local.getDate()).padStart(2, "0");
  const h = String(local.getHours()).padStart(2, "0");
  const mi = String(local.getMinutes()).padStart(2, "0");
  const s = String(local.getSeconds()).padStart(2, "0");
  const offset = om === "00" ? `${sign}${oh}` : `${sign}${oh}:${om}`;
  return `${y}-${mo}-${da} ${h}:${mi}:${s}${offset}`;
}

export function formatDateTimePl(date: Date, tz: string = TZ): string {
  const local = new TZDate(date, tz);
  return format(local, "dd.MM.yyyy HH:mm");
}

export function formatDatePl(date: Date | PlainDate, tz: string = TZ): string {
  if (typeof date === "string") {
    const [ys, ms, ds] = date.split("-");
    const local = new TZDate(Number(ys), Number(ms) - 1, Number(ds), 12, 0, 0, 0, tz);
    return format(local, "dd.MM.yyyy");
  }
  const local = new TZDate(date, tz);
  return format(local, "dd.MM.yyyy");
}

export function formatTimePl(date: Date, tz: string = TZ): string {
  const local = new TZDate(date, tz);
  return format(local, "HH:mm");
}

/** `82%` — wejście 0–100 lub ułamek 0–1 (gdy |value| ≤ 1). */
export function formatPercent(value: number): string {
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${String(Math.round(pct))}%`;
}
