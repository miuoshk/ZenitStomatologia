import { describe, expect, it } from "vitest";
import { FixedClock, instantFromIso } from "@crux/shared/time";
import { dayWindow, fullWindow, incrementalWindow } from "./windows";

describe("okna odświeżania", () => {
  it("full: 13 miesięcy kalendarzowych do dziś (Europe/Warsaw)", () => {
    const clock = new FixedClock(instantFromIso("2026-11-25T18:00:00Z"));
    expect(fullWindow(clock)).toEqual({ from: "2025-11-01", to: "2026-11-25" });
    expect(fullWindow(new FixedClock(instantFromIso("2026-01-15T12:00:00Z")))).toEqual({
      from: "2025-01-01",
      to: "2026-01-15",
    });
  });

  it("incremental: 48 h wstecz, granica dnia lokalnego", () => {
    const clock = new FixedClock(instantFromIso("2026-11-25T23:30:00Z")); // 26.11 00:30 w Warszawie
    expect(incrementalWindow(clock)).toEqual({ from: "2026-11-24", to: "2026-11-26" });
  });

  it("dayWindow: jeden dzień", () => {
    expect(dayWindow("2026-03-10")).toEqual({ from: "2026-03-10", to: "2026-03-10" });
  });
});
