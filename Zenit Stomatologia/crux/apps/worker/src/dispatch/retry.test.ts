import { describe, expect, it } from "vitest";
import { FixedClock, instantFromIso } from "@crux/shared/time";
import { MAX_OUTBOX_ATTEMPTS, nextAttemptAt, shouldMarkDead } from "./retry";

describe("outbox retry", () => {
  it("nextAttemptAt: now + 2^attempts minut (FixedClock)", () => {
    const clock = new FixedClock(instantFromIso("2026-11-25T12:00:00.000Z"));
    const next = nextAttemptAt(clock, 3);
    // 2^3 = 8 minut
    expect(next.toISOString()).toBe("2026-11-25T12:08:00.000Z");
  });

  it("shouldMarkDead po 8 próbach", () => {
    expect(shouldMarkDead(7)).toBe(false);
    expect(shouldMarkDead(MAX_OUTBOX_ATTEMPTS)).toBe(true);
    expect(shouldMarkDead(9)).toBe(true);
  });
});
