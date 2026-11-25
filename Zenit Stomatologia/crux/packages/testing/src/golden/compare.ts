import type { GoldenExpected } from "./metrics";

const EPS = 1e-9;

type Json = Record<string, unknown>;

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}

function cmp(path: string, want: unknown, got: unknown, out: string[]): void {
  if (typeof want === "object" && want !== null) {
    const g = (got ?? {}) as Json;
    for (const [k, v] of Object.entries(want as Json)) cmp(`${path}.${k}`, v, g[k], out);
    return;
  }
  const a = num(want);
  const b = num(got);
  if (!Number.isFinite(b) || Math.abs(a - b) > EPS * Math.max(1, Math.abs(a))) {
    out.push(`${path}: expected ${String(want)}, got ${String(got)}`);
  }
}

/** Porównuje metryki z verify.sql (actual) z expected.json; zwraca listę różnic. */
export function compareGolden(expected: GoldenExpected, actual: Json): string[] {
  const out: string[] = [];
  const keys = [
    "chair_utilization",
    "chair_hours_worked",
    "revenue_realized",
    "revenue_per_chair_hour",
    "revenue_by_category",
    "provider_hours_worked",
    "days_closed_rate",
  ] as const;
  for (const k of keys) cmp(k, expected[k], actual[k], out);
  const counts = (actual["counts"] ?? {}) as Json;
  for (const k of [
    "entries",
    "time_blocks",
    "day_closures",
    "working_location_days",
    "available_minutes",
    "occupied_minutes",
  ] as const) {
    cmp(`counts.${k}`, expected.counts[k], counts[k], out);
  }
  return out;
}
