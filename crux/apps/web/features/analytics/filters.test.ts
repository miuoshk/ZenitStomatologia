import type { Actor } from "@crux/db";
import { describe, expect, it } from "vitest";
import { dashboardAccess } from "./access";
import { toCsv } from "./csv";
import { addDays, isoWeekdayIndex, minusOneYear, startOfIsoWeek } from "./dates";
import {
  drilldownHref,
  filtersToSearchParams,
  parseDashboardFilters,
  parseFilterState,
  resolveComparePeriod,
  setWidokParam,
} from "./filters";

const L1 = "11111111-1111-4111-8111-111111111111";
const L2 = "22222222-2222-4222-8222-222222222222";
const STAFF = "33333333-3333-4333-8333-333333333333";
const locations = [
  { id: L1, number: "01" },
  { id: L2, number: "02" },
];

function actor(permissions: string[], locationIds: string[] = [L1]): Actor {
  return {
    staffId: STAFF,
    tenantId: "44444444-4444-4444-8444-444444444444",
    locationIds,
    activeLocationId: locationIds[0] ?? L1,
    role: "test",
    permissions,
  };
}

describe("[F0-011/AC2] kontrakt filtrów URL", () => {
  it("domyślne wartości: 30d, poprzedni, wszystkie gabinety", () => {
    const s = parseFilterState({});
    expect(s).toMatchObject({ okres: "30d", porownaj: "poprzedni", gabinet: [], wykonawca: null, kategoria: [] });
  });

  it("round-trip: stan → URL → stan", () => {
    const s = parseFilterState({ okres: "od", od: "2025-10-01", do: "2026-10-31", porownaj: "rok_temu", gabinet: "01,02", kategoria: "Z5,Z+" });
    const back = parseFilterState(Object.fromEntries(filtersToSearchParams(s)));
    expect(back).toEqual(s);
  });

  it("niepoprawne wartości wracają do domyślnych", () => {
    const s = parseFilterState({ okres: "xx", porownaj: "?", od: "2026-13-40", kategoria: "Z9", wykonawca: "nie-uuid" });
    expect(s.okres).toBe("30d");
    expect(s.porownaj).toBe("poprzedni");
    expect(s.kategoria).toEqual([]);
    expect(s.wykonawca).toBeNull();
  });

  it("okres=od wymaga poprawnego zakresu; od/do bez okresu włączają zakres", () => {
    expect(parseFilterState({ okres: "od", od: "2026-10-31", do: "2026-10-01" }).okres).toBe("30d");
    expect(parseFilterState({ od: "2026-10-01", do: "2026-10-31" }).okres).toBe("od");
  });

  it("okresy względem dziś (2026-11-25, środa)", () => {
    const f = (okres: string) =>
      parseDashboardFilters({ okres }, actor(["analytics.view_network"]), locations, { today: "2026-11-25" }).period;
    expect(f("dzis")).toEqual({ from: "2026-11-25", to: "2026-11-25" });
    expect(f("7d")).toEqual({ from: "2026-11-19", to: "2026-11-25" });
    expect(f("30d")).toEqual({ from: "2026-10-27", to: "2026-11-25" });
    expect(f("mtd")).toEqual({ from: "2026-11-01", to: "2026-11-25" });
    expect(f("kw")).toEqual({ from: "2026-11-23", to: "2026-11-25" });
    expect(f("rok")).toEqual({ from: "2026-01-01", to: "2026-11-25" });
  });

  it("okres porównawczy: poprzedni = tyle samo dni wstecz, rok_temu = przesunięcie o rok", () => {
    const p = { from: "2026-10-01", to: "2026-10-31" };
    expect(resolveComparePeriod("poprzedni", p)).toEqual({ from: "2026-08-31", to: "2026-09-30" });
    expect(resolveComparePeriod("rok_temu", p)).toEqual({ from: "2025-10-01", to: "2025-10-31" });
    expect(resolveComparePeriod("cel", p)).toBeNull();
  });

  it("gabinet=01,02 mapuje numery na identyfikatory", () => {
    const f = parseDashboardFilters({ gabinet: "02" }, actor(["analytics.view_network"], [L1, L2]), locations, { today: "2026-11-25" });
    expect(f.metric.locationIds).toEqual([L2]);
  });

  it("link drążenia niesie metrykę i filtry", () => {
    const s = parseFilterState({ okres: "7d", gabinet: "01", kategoria: "Z5" });
    expect(drilldownHref("chair_hours_worked", s)).toBe(
      "/lista/oblozenie?metric=chair_hours_worked&okres=7d&gabinet=01&kategoria=Z5",
    );
  });

  it("widok per karta zapisuje się w URL", () => {
    const q = setWidokParam("okres=7d", "przychod", "tabela");
    expect(parseFilterState(Object.fromEntries(new URLSearchParams(q))).widok).toEqual({ przychod: "tabela" });
  });
});

describe("[F0-011/AC3] serwer przycina filtry do roli", () => {
  it("lekarz: wykonawca = ja, parametr wykonawca ignorowany", () => {
    const other = "55555555-5555-4555-8555-555555555555";
    const f = parseDashboardFilters({ wykonawca: other }, actor(["analytics.view_self"]), locations, { today: "2026-11-25", mode: "self" });
    expect(f.metric.providerIds).toEqual([STAFF]);
  });

  it("kierownik 01: gabinet=02 poza członkostwem → własny gabinet", () => {
    const f = parseDashboardFilters({ gabinet: "02" }, actor(["analytics.view_location"], [L1]), locations, { today: "2026-11-25", mode: "location" });
    expect(f.metric.locationIds).toEqual([L1]);
  });

  it("przekierowania ról", () => {
    expect(dashboardAccess(["analytics.view_self"], "network")).toEqual({ kind: "redirect", to: "/pulpit/moje" });
    expect(dashboardAccess(["analytics.view_location", "analytics.view_self"], "network")).toEqual({ kind: "redirect", to: "/pulpit/gabinet" });
    expect(dashboardAccess(["analytics.view_network"], "network")).toEqual({ kind: "ok" });
    expect(dashboardAccess(["analytics.view_self"], "location")).toEqual({ kind: "redirect", to: "/pulpit/moje" });
    expect(dashboardAccess(["analytics.view_location"], "self")).toEqual({ kind: "redirect", to: "/pulpit/gabinet" });
    expect(dashboardAccess([], "network")).toEqual({ kind: "forbidden" });
  });
});

describe("daty kalendarzowe", () => {
  it("dni tygodnia ISO i przesunięcia", () => {
    expect(isoWeekdayIndex("2026-11-25")).toBe(2); // środa
    expect(startOfIsoWeek("2026-11-25")).toBe("2026-11-23");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(minusOneYear("2024-02-29")).toBe("2023-02-28");
  });
});

describe("CSV", () => {
  it("separator, przecinek dziesiętny i ochrona przed formułami", () => {
    const csv = toCsv(["a", "b"], [["=SUM(A1)", 1.5], ['x;"y"', null]]);
    expect(csv).toBe('\uFEFFa;b\r\n\'=SUM(A1);1,5\r\n"x;""y""";\r\n');
  });
});
