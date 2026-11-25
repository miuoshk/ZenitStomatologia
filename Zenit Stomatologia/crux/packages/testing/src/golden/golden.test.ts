import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isTestNpwz } from "../generators/npwz";
import { createRng } from "../generators/rng";
import { buildGoldenDataset } from "./dataset";
import { GOLDEN_END, GOLDEN_SEED, GOLDEN_START } from "./constants";
import { EXPECTED_PATH, readExpected } from "./files";

describe("golden dataset", () => {
  const a = buildGoldenDataset();

  it("[K12] ta sama pozycja ziarna → te same liczby i sumy", () => {
    const b = buildGoldenDataset(createRng(GOLDEN_SEED));
    expect(b.entries.length).toBe(a.entries.length);
    expect(b.expected).toEqual(a.expected);
    expect(b.staff.map((s) => [s.firstName, s.lastName, s.npwz])).toEqual(
      a.staff.map((s) => [s.firstName, s.lastName, s.npwz]),
    );
  });

  it("[K12] struktura: 2 gabinety (01: 3 fotele, 02: 2), 5 dentystów, 6 blokad, 13 miesięcy", () => {
    expect(a.locations.map((l) => [l.number, l.colorKey, l.chairs.length])).toEqual([
      ["01", "01", 3],
      ["02", "02", 2],
    ]);
    expect(a.staff.filter((s) => s.role === "dentist")).toHaveLength(5);
    expect(a.timeBlocks).toHaveLength(6);
    expect(a.start).toBe(GOLDEN_START);
    expect(a.end).toBe(GOLDEN_END);
    expect(a.entries.every((e) => e.day >= a.start && e.day <= a.end)).toBe(true);
    for (const s of a.staff.filter((x) => x.npwz)) expect(isTestNpwz(s.npwz as string)).toBe(true);
  });

  it("[K12] wypełnienie ≈80% (01) i ≈65% (02), zamknięte dni ≈95%", () => {
    const u = a.expected.by_location;
    expect(u["01"]?.chair_utilization).toBeGreaterThan(0.7);
    expect(u["01"]?.chair_utilization).toBeLessThan(0.85);
    expect(u["02"]?.chair_utilization).toBeGreaterThan(0.55);
    expect(u["02"]?.chair_utilization).toBeLessThan(0.7);
    expect(a.expected.days_closed_rate).toBeGreaterThan(0.92);
    expect(a.expected.days_closed_rate).toBeLessThan(0.98);
  });

  it("[K12] golden/expected.json jest aktualny (uruchom `pnpm --filter @crux/testing gen:golden`)", async () => {
    expect(await readExpected()).toEqual(a.expected);
    expect((await readFile(EXPECTED_PATH, "utf8")).endsWith("\n")).toBe(true);
  });
});

describe("dates", () => {
  it("[K12] dzień tygodnia i dodawanie dni", async () => {
    const { addDays, isoWeekday } = await import("./dates");
    expect(isoWeekday("2026-10-31")).toBe(6); // sobota
    expect(isoWeekday("2027-03-10")).toBe(3); // środa
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});
