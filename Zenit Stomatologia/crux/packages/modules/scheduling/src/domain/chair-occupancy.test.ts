import { describe, expect, it } from "vitest";
import { FixedClock, instantFromIso, plainDate } from "@crux/shared/time";
import {
  DayClosure,
  OccupancyEntry,
  isDayClosed,
  isHourWithinWindow,
  type OccupancyContext,
  type OccupancyEntryInput,
} from "./chair-occupancy";

const clock = new FixedClock(instantFromIso("2027-03-10T09:00:00Z"));
const CHAIR = "0195a000-0000-7000-8000-000000000001";
const OPEN = { closed: false, opens: "08:00:00", closes: "20:00:00" };

function ctx(over: Partial<OccupancyContext> = {}): OccupancyContext {
  return {
    canOverrideHours: false,
    isWithinOpeningHours: (_d, h) => isHourWithinWindow(OPEN, h),
    isBlocked: () => false,
    ...over,
  };
}

function input(over: Partial<OccupancyEntryInput> = {}): OccupancyEntryInput {
  return {
    tenantId: "0195a000-0000-7000-8000-0000000000aa",
    locationId: "0195a000-0000-7000-8000-0000000000bb",
    chairId: CHAIR,
    day: plainDate("2027-03-10"),
    hour: 10,
    category: "Z2",
    amountGrosze: 15000n,
    ...over,
  };
}

describe("OccupancyEntry.create", () => {
  it("tworzy wpis z pełną godziną lokalną", () => {
    const r = OccupancyEntry.create(input(), clock, ctx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.period).toBe("[2027-03-10 10:00:00+01,2027-03-10 11:00:00+01)");
      expect(r.value.source).toBe("manual");
      expect(r.value.createdAt.toISOString()).toBe("2027-03-10T09:00:00.000Z");
    }
  });

  it("odrzuca kategorię spoza Z1…Z+ i akceptuje Z+", () => {
    const bad = OccupancyEntry.create(input({ category: "Z6" }), clock, ctx());
    expect(bad.ok).toBe(false);
    for (const c of ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"]) {
      expect(OccupancyEntry.create(input({ category: c }), clock, ctx()).ok).toBe(true);
    }
  });

  it("kwota: ujemna odrzucona, null i 0 dozwolone", () => {
    expect(OccupancyEntry.create(input({ amountGrosze: -1n }), clock, ctx()).ok).toBe(false);
    expect(OccupancyEntry.create(input({ amountGrosze: null }), clock, ctx()).ok).toBe(true);
    expect(OccupancyEntry.create(input({ amountGrosze: 0n }), clock, ctx()).ok).toBe(true);
  });

  it("[F0-010/AC7] notatka > 80 znaków odrzucona", () => {
    const r = OccupancyEntry.create(input({ note: "x".repeat(81) }), clock, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ details: { code: "note_too_long" } });
    expect(OccupancyEntry.create(input({ note: "x".repeat(80) }), clock, ctx()).ok).toBe(true);
  });

  it("[F0-010/AC7] notatka z PESEL, telefonem lub e-mailem odrzucona", () => {
    for (const note of ["44051401359", "tel 600123456", "jan@example.com", "+48 600123456"]) {
      const r = OccupancyEntry.create(input({ note }), clock, ctx());
      expect(r.ok, note).toBe(false);
      if (!r.ok) expect(r.error).toMatchObject({ details: { code: "note_contains_pii" } });
    }
    expect(OccupancyEntry.create(input({ note: "przegląd, lakowanie" }), clock, ctx()).ok).toBe(
      true,
    );
  });

  it("[F0-010/AC3] poza godzinami otwarcia bez uprawnienia → forbidden", () => {
    const r = OccupancyEntry.create(input({ hour: 6 }), clock, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.type).toBe("forbidden");
  });

  it("[F0-010/AC3] poza godzinami z uprawnieniem wymaga powodu", () => {
    const c = ctx({ canOverrideHours: true });
    const noReason = OccupancyEntry.create(input({ hour: 6 }), clock, c);
    expect(noReason.ok).toBe(false);
    if (!noReason.ok) {
      expect(noReason.error).toMatchObject({ details: { code: "override_reason_required" } });
    }
    const ok = OccupancyEntry.create(input({ hour: 6, overrideReason: "zabieg pilny" }), clock, c);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.overrideReason).toBe("zabieg pilny");
  });

  it("w godzinach otwarcia ignoruje overrideReason", () => {
    const r = OccupancyEntry.create(input({ overrideReason: "x" }), clock, ctx());
    expect(r.ok && r.value.overrideReason).toBe(null);
  });

  it("odrzuca godzinę z blokady fotela", () => {
    const r = OccupancyEntry.create(input(), clock, ctx({ isBlocked: (chair) => chair === CHAIR }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ details: { code: "chair_blocked" } });
  });

  it("odrzuca godzinę poza 0–23", () => {
    expect(OccupancyEntry.create(input({ hour: 24 }), clock, ctx()).ok).toBe(false);
    expect(OccupancyEntry.create(input({ hour: 1.5 }), clock, ctx()).ok).toBe(false);
  });

  it("DST wiosna (2027-03-28): godzina 2 nie istnieje, 3 i 10 mają poprawny offset", () => {
    const day = plainDate("2027-03-28");
    const all = ctx({ isWithinOpeningHours: () => true });
    const gap = OccupancyEntry.create(input({ day, hour: 2 }), clock, all);
    expect(gap.ok).toBe(false);
    if (!gap.ok) expect(gap.error).toMatchObject({ details: { code: "nonexistent_hour" } });

    const h3 = OccupancyEntry.create(input({ day, hour: 3 }), clock, all);
    expect(h3.ok && h3.value.period).toBe("[2027-03-28 03:00:00+02,2027-03-28 04:00:00+02)");
    const h1 = OccupancyEntry.create(input({ day, hour: 1 }), clock, all);
    expect(h1.ok && h1.value.period).toBe("[2027-03-28 01:00:00+01,2027-03-28 03:00:00+02)");
  });

  it("DST jesień (2027-10-31): godzina 23 kończy się o północy w +01", () => {
    const day = plainDate("2027-10-31");
    const r = OccupancyEntry.create(
      input({ day, hour: 23 }),
      clock,
      ctx({ isWithinOpeningHours: () => true }),
    );
    expect(r.ok && r.value.period).toBe("[2027-10-31 23:00:00+01,2027-11-01 00:00:00+01)");
  });
});

describe("OccupancyEntry.void", () => {
  const base = { voidedAt: null as Date | null };

  it("wymaga powodu", () => {
    expect(OccupancyEntry.void(base, "  ", clock).ok).toBe(false);
  });

  it("ustawia voidedAt z zegara i powód", () => {
    const r = OccupancyEntry.void(base, "pomyłka", clock, "staff-1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.voidedAt.toISOString()).toBe("2027-03-10T09:00:00.000Z");
      expect(r.value.voidReason).toBe("pomyłka");
      expect(r.value.voidedBy).toBe("staff-1");
    }
  });

  it("nie anuluje dwa razy", () => {
    const r = OccupancyEntry.void({ voidedAt: clock.now() }, "x", clock);
    expect(r.ok).toBe(false);
  });
});

describe("DayClosure.close / isDayClosed", () => {
  const chairs = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];

  it("podsumowuje godziny, kwotę i fotele bez wpisów (pomija anulowane)", () => {
    const s = DayClosure.close(
      "loc",
      plainDate("2027-03-10"),
      [
        { chairId: "c1", amountGrosze: 10000n },
        { chairId: "c1", amountGrosze: null },
        { chairId: "c2", amountGrosze: 5000n, voidedAt: clock.now() },
      ],
      chairs,
    );
    expect(s).toEqual({
      hours: 2,
      amount_grosze: 10000,
      chairs_without_entries: ["c2", "c3"],
    });
  });

  it("isDayClosed: otwarte po reopen", () => {
    expect(isDayClosed(null)).toBe(false);
    expect(isDayClosed({ closedAt: clock.now(), reopenedAt: null })).toBe(true);
    expect(isDayClosed({ closedAt: clock.now(), reopenedAt: clock.now() })).toBe(false);
  });
});

describe("isHourWithinWindow", () => {
  it("granice okna", () => {
    expect(isHourWithinWindow(OPEN, 8)).toBe(true);
    expect(isHourWithinWindow(OPEN, 19)).toBe(true);
    expect(isHourWithinWindow(OPEN, 20)).toBe(false);
    expect(isHourWithinWindow(OPEN, 7)).toBe(false);
    expect(isHourWithinWindow({ closed: true, opens: null, closes: null }, 10)).toBe(false);
  });
});
