import { describe, expect, it } from "vitest";
import {
  FixedClock,
  formatDatePl,
  formatDateTimePl,
  formatPercent,
  formatTimePl,
  hourRange,
  instantFromIso,
  plainDate,
  startOfDayIn,
  toLocalDay,
  TZ,
} from "./time";

describe("time", () => {
  it("FixedClock jest deterministyczny", () => {
    const instant = instantFromIso("2027-02-14T12:00:00.000Z");
    const clock = new FixedClock(instant);
    expect(clock.now().toISOString()).toBe(instant.toISOString());
    expect(clock.now()).not.toBe(clock.now());
  });

  it("startOfDayIn dla 2027-03-28 (dzień zmiany czasu)", () => {
    const day = plainDate("2027-03-28");
    const start = startOfDayIn(TZ, day);
    // 00:00 CET = UTC 23:00 dnia poprzedniego
    expect(start.toISOString()).toBe("2027-03-27T23:00:00.000Z");
    expect(toLocalDay(start, TZ)).toBe("2027-03-28");
  });

  it("hourRange godziny 2:00 w dniu zmiany czasu → zakres zerowy", () => {
    const day = plainDate("2027-03-28");
    const range = hourRange(day, 2, TZ);
    // TZDate mapuje nieistniejącą 2:00 i 3:00 na ten sam punkt → [t,t)
    const match = /^\[(.+),(.+)\)$/.exec(range);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(match?.[2]);
  });

  it("hourRange zwykłej godziny ma długość 1 h", () => {
    const day = plainDate("2027-03-28");
    const range = hourRange(day, 10, TZ);
    expect(range).toBe("[2027-03-28 10:00:00+02,2027-03-28 11:00:00+02)");
  });

  it("formatowanie PL", () => {
    const d = instantFromIso("2027-02-14T13:30:00.000Z"); // 14:30 Warsaw (CET)
    expect(formatDatePl(d)).toBe("14.02.2027");
    expect(formatDatePl(plainDate("2027-02-14"))).toBe("14.02.2027");
    expect(formatTimePl(d)).toBe("14:30");
    expect(formatDateTimePl(d)).toBe("14.02.2027 14:30");
    expect(formatPercent(82)).toBe("82%");
    expect(formatPercent(0.82)).toBe("82%");
  });
});
