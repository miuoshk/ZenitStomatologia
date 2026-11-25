import type { OpeningHoursParams } from "../factories/opening-hours";
import { eachDay, isoWeekday } from "./dates";
import { CATEGORY_KEYS } from "../factories/categories";

export type GoldenExpected = {
  meta: {
    seed: number;
    period: { from: string; to: string };
    tenant_id: string;
    locations: Record<string, string>;
    provider_keys: string[];
  };
  chair_utilization: number;
  chair_hours_worked: number;
  revenue_realized: number;
  revenue_per_chair_hour: number;
  revenue_by_category: Record<string, number>;
  provider_hours_worked: Record<string, number>;
  days_closed_rate: number;
  counts: {
    entries: number;
    time_blocks: number;
    day_closures: number;
    working_location_days: number;
    available_minutes: number;
    occupied_minutes: number;
  };
  by_location: Record<string, { chair_utilization: number; entries: number }>;
};

/** Minimalny kształt wejścia (strukturalny — dataset.ts spełnia go bez importu zwrotnego). */
type Input = {
  seed: number;
  start: string;
  end: string;
  tenant: { id: string };
  openingHours: OpeningHoursParams[];
  locations: Array<{ number: string; id: string; chairs: unknown[] }>;
  entries: Array<{ locationNumber: string; day: string; category: string; providerKey: string; amountGrosze: number }>;
  timeBlocks: Array<{ locationNumber: string; startHour: number; endHour: number }>;
  closures: unknown[];
};

/** Metryki dla pełnego okresu golden, wszystkie gabinety. Definicje: golden/README.md. */
export function computeExpected(d: Input): GoldenExpected {
  const hoursByWeekday = new Map(d.openingHours.map((h) => [h.weekday, h]));
  const days = eachDay(d.start, d.end);

  let availableMinutes = 0;
  let workingLocationDays = 0;
  const availableByLoc: Record<string, number> = {};
  for (const day of days) {
    const win = hoursByWeekday.get(isoWeekday(day));
    if (!win) continue;
    const openMin = (Number(win.closes.slice(0, 2)) - Number(win.opens.slice(0, 2))) * 60;
    for (const loc of d.locations) {
      workingLocationDays += 1;
      const add = loc.chairs.length * openMin;
      availableMinutes += add;
      availableByLoc[loc.number] = (availableByLoc[loc.number] ?? 0) + add;
    }
  }
  for (const b of d.timeBlocks) {
    const m = (b.endHour - b.startHour) * 60;
    availableMinutes -= m;
    availableByLoc[b.locationNumber] = (availableByLoc[b.locationNumber] ?? 0) - m;
  }

  const byCategory: Record<string, number> = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, 0]));
  const byProvider: Record<string, number> = {};
  const entriesByLoc: Record<string, number> = {};
  let revenue = 0;
  for (const e of d.entries) {
    revenue += e.amountGrosze;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountGrosze;
    byProvider[e.providerKey] = (byProvider[e.providerKey] ?? 0) + 1;
    entriesByLoc[e.locationNumber] = (entriesByLoc[e.locationNumber] ?? 0) + 1;
  }
  const occupiedMinutes = d.entries.length * 60;
  const chairHours = occupiedMinutes / 60;

  return {
    meta: {
      seed: d.seed,
      period: { from: d.start, to: d.end },
      tenant_id: d.tenant.id,
      locations: Object.fromEntries(d.locations.map((l) => [l.number, l.id])),
      provider_keys: Object.keys(byProvider).sort(),
    },
    chair_utilization: occupiedMinutes / availableMinutes,
    chair_hours_worked: chairHours,
    revenue_realized: revenue,
    revenue_per_chair_hour: revenue / chairHours,
    revenue_by_category: byCategory,
    provider_hours_worked: Object.fromEntries(Object.entries(byProvider).sort()),
    days_closed_rate: d.closures.length / workingLocationDays,
    counts: {
      entries: d.entries.length,
      time_blocks: d.timeBlocks.length,
      day_closures: d.closures.length,
      working_location_days: workingLocationDays,
      available_minutes: availableMinutes,
      occupied_minutes: occupiedMinutes,
    },
    by_location: Object.fromEntries(
      d.locations.map((l) => [
        l.number,
        {
          chair_utilization: ((entriesByLoc[l.number] ?? 0) * 60) / (availableByLoc[l.number] ?? 1),
          entries: entriesByLoc[l.number] ?? 0,
        },
      ]),
    ),
  };
}
