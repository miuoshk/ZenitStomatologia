import { stableUuid } from "../generators/ids";
import { createRng, pickWeighted, randInt, shuffle, type Rng } from "../generators/rng";
import {
  CATEGORY_WEIGHTS,
  amountFor,
  chairFactory,
  locationFactory,
  openingHoursFactory,
  staffFactory,
  type CategoryKey,
  type ChairParams,
  type LocationParams,
  type OpeningHoursParams,
  type StaffParams,
} from "../factories";
import {
  DAY_CLOSURE_RATE,
  FILL_TARGET,
  GOLDEN_END,
  GOLDEN_SEED,
  GOLDEN_START,
  GOLDEN_TENANT_ID,
  GOLDEN_TENANT_NAME,
  GOLDEN_TIME_BLOCK_COUNT,
  SATURDAY_FILL_FACTOR,
} from "./constants";
import { eachDay, isoWeekday } from "./dates";
import { computeExpected, type GoldenExpected } from "./metrics";

export type GoldenChair = ChairParams & { id: string };
export type GoldenLocation = LocationParams & {
  id: string;
  chairs: GoldenChair[];
  providerKeys: string[];
};
export type GoldenStaff = StaffParams & { id: string; locationNumbers: Array<"01" | "02"> };

export type GoldenEntry = {
  locationNumber: "01" | "02";
  chairIndex: number;
  day: string;
  hour: number;
  providerKey: string;
  category: CategoryKey;
  amountGrosze: number;
};

export type GoldenTimeBlock = {
  locationNumber: "01" | "02";
  chairIndex: number;
  day: string;
  startHour: number;
  /** wyłącznie */
  endHour: number;
  kind: string;
};

export type GoldenClosure = {
  locationNumber: "01" | "02";
  day: string;
  hours: number;
  amountGrosze: number;
  chairsWithoutEntries: string[];
};

export type GoldenDataset = {
  seed: number;
  start: string;
  end: string;
  tenant: { id: string; name: string };
  openingHours: OpeningHoursParams[];
  locations: GoldenLocation[];
  staff: GoldenStaff[];
  entries: GoldenEntry[];
  timeBlocks: GoldenTimeBlock[];
  closures: GoldenClosure[];
  expected: GoldenExpected;
};

const NUMBERS = ["01", "02"] as const;
const CHAIR_COUNT = { "01": 3, "02": 2 } as const;
/** Dentyści: 01 → prov1–3, 02 → prov4–5 (brak konfliktów między gabinetami). */
const PROVIDERS_BY_LOCATION = { "01": ["prov1", "prov2", "prov3"], "02": ["prov4", "prov5"] } as const;

export function buildGoldenDataset(rng: Rng = createRng(GOLDEN_SEED)): GoldenDataset {
  const openingHours = openingHoursFactory();
  const hoursByWeekday = new Map(openingHours.map((h) => [h.weekday, h]));

  const locations: GoldenLocation[] = NUMBERS.map((number) => ({
    ...locationFactory(number),
    id: stableUuid(`golden:location:${number}`),
    providerKeys: [...PROVIDERS_BY_LOCATION[number]],
    chairs: Array.from({ length: CHAIR_COUNT[number] }, (_, i) => ({
      ...chairFactory(i + 1),
      id: stableUuid(`golden:chair:${number}:${String(i + 1)}`),
    })),
  }));

  const staff: GoldenStaff[] = [];
  for (const [i, key] of ["prov1", "prov2", "prov3", "prov4", "prov5"].entries()) {
    const number = i < 3 ? "01" : "02";
    staff.push({
      ...staffFactory(rng, key, "dentist"),
      id: stableUuid(`golden:staff:${key}`),
      locationNumbers: [number],
    });
  }
  staff.push({
    ...staffFactory(rng, "reception", "receptionist"),
    id: stableUuid("golden:staff:reception"),
    locationNumbers: ["01", "02"],
  });
  staff.push({
    ...staffFactory(rng, "manager", "location_manager"),
    id: stableUuid("golden:staff:manager"),
    locationNumbers: ["01", "02"],
  });

  const days = eachDay(GOLDEN_START, GOLDEN_END);
  const workDays = days.filter((d) => hoursByWeekday.has(isoWeekday(d)));

  // Dokładnie 6 blokad (pon–pt, 2–4 h w środku dnia); unikalna para fotel+dzień.
  const timeBlocks: GoldenTimeBlock[] = [];
  const used = new Set<string>();
  const weekdays = workDays.filter((d) => isoWeekday(d) <= 5);
  while (timeBlocks.length < GOLDEN_TIME_BLOCK_COUNT) {
    const number = NUMBERS[randInt(rng, 0, 1)] as "01" | "02";
    const chairIndex = randInt(rng, 0, CHAIR_COUNT[number] - 1);
    const day = weekdays[randInt(rng, 0, weekdays.length - 1)] as string;
    const key = `${number}|${String(chairIndex)}|${day}`;
    if (used.has(key)) continue;
    used.add(key);
    const startHour = randInt(rng, 9, 15);
    timeBlocks.push({
      locationNumber: number,
      chairIndex,
      day,
      startHour,
      endHour: startHour + randInt(rng, 2, 4),
      kind: "serwis",
    });
  }
  const blocked = new Set<string>();
  for (const b of timeBlocks) {
    for (let h = b.startHour; h < b.endHour; h += 1) {
      blocked.add(`${b.locationNumber}|${String(b.chairIndex)}|${b.day}|${String(h)}`);
    }
  }

  const entries: GoldenEntry[] = [];
  const closures: GoldenClosure[] = [];
  for (const day of workDays) {
    const win = hoursByWeekday.get(isoWeekday(day));
    if (!win) continue;
    const opens = Number(win.opens.slice(0, 2));
    const closes = Number(win.closes.slice(0, 2));
    const isSaturday = isoWeekday(day) === 6;
    for (const loc of locations) {
      const number = loc.number as "01" | "02";
      const p = FILL_TARGET[number] * (isSaturday ? SATURDAY_FILL_FACTOR : 1);
      // Rotacja wykonawców: fotel i → i-ty z przetasowanej listy gabinetu.
      const providers = shuffle(rng, loc.providerKeys);
      const dayEntries: GoldenEntry[] = [];
      for (const [chairIndex] of loc.chairs.entries()) {
        const providerKey = providers[chairIndex % providers.length] as string;
        for (let hour = opens; hour < closes; hour += 1) {
          if (blocked.has(`${number}|${String(chairIndex)}|${day}|${String(hour)}`)) continue;
          if (rng() >= p) continue;
          const category = pickWeighted(rng, CATEGORY_WEIGHTS);
          dayEntries.push({
            locationNumber: number,
            chairIndex,
            day,
            hour,
            providerKey,
            category,
            amountGrosze: amountFor(rng, category),
          });
        }
      }
      entries.push(...dayEntries);
      if (rng() < DAY_CLOSURE_RATE) {
        closures.push({
          locationNumber: number,
          day,
          hours: dayEntries.length,
          amountGrosze: dayEntries.reduce((a, e) => a + e.amountGrosze, 0),
          chairsWithoutEntries: loc.chairs
            .filter((_, i) => !dayEntries.some((e) => e.chairIndex === i))
            .map((c) => c.id),
        });
      }
    }
  }

  const partial = {
    seed: GOLDEN_SEED,
    start: GOLDEN_START,
    end: GOLDEN_END,
    tenant: { id: GOLDEN_TENANT_ID, name: GOLDEN_TENANT_NAME },
    openingHours,
    locations,
    staff,
    entries,
    timeBlocks,
    closures,
  };
  return { ...partial, expected: computeExpected(partial) };
}
