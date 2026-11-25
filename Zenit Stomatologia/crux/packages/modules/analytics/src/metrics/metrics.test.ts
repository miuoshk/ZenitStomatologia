import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor, CruxDb } from "@crux/db";
import { createTestDb } from "@crux/db/testing";
import {
  buildGoldenDataset,
  createFakeKeyProvider,
  goldenActor,
  readExpected,
  resetAndSeedGolden,
  stableUuid,
  type GoldenExpected,
} from "@crux/testing";
import { sql } from "drizzle-orm";
import {
  clearMetricCache,
  drilldownCapacity,
  drilldownOccupancy,
  metricRegistry,
  METRIC_IDS,
  refreshAnalytics,
  runMetric,
  stableSerialize,
  type MetricFilters,
  type MetricId,
} from "../index";
import { instantFromIso, plusMs, type Clock } from "@crux/shared/time";

const TOL = 1e-6;

describe("@crux/analytics — metryki na zestawie wzorcowym", () => {
  let app: CruxDb;
  let worker: CruxDb;
  let expected: GoldenExpected;
  let admin: Actor;
  let manager01: Actor;
  let dentist1: Actor;
  let filters: MetricFilters;
  let providerLabel: Map<string, string>;

  const checksum = (): Promise<{ counts: string; sum: string }> =>
    worker.withWorker("analytics.refresh", async (tx) => {
      const counts = await tx.execute(sql`
        select (select count(*) from analytics.fact_chair_capacity)::text || '/' ||
               (select count(*) from analytics.fact_chair_occupancy)::text || '/' ||
               (select count(*) from analytics.fact_day_closures)::text as c`);
      const sums = await tx.execute(sql`
        select md5(
          coalesce((select string_agg((to_jsonb(f) - 'refreshed_at')::text, '|' order by (to_jsonb(f) - 'refreshed_at')::text) from analytics.fact_chair_capacity f), '') ||
          coalesce((select string_agg((to_jsonb(f) - 'refreshed_at')::text, '|' order by (to_jsonb(f) - 'refreshed_at')::text) from analytics.fact_chair_occupancy f), '') ||
          coalesce((select string_agg((to_jsonb(f) - 'refreshed_at')::text, '|' order by (to_jsonb(f) - 'refreshed_at')::text) from analytics.fact_day_closures f), '')
        ) as s`);
      return {
        counts: (counts[0] as { c: string }).c,
        sum: (sums[0] as { s: string }).s,
      };
    });

  beforeAll(async () => {
    app = createTestDb("app");
    worker = createTestDb("worker");
    expected = await readExpected();
    const dataset = buildGoldenDataset();
    await resetAndSeedGolden(app, dataset, createFakeKeyProvider());

    const base = goldenActor(dataset);
    const [loc01, loc02] = dataset.locations.map((l) => l.id);
    if (!loc01 || !loc02) throw new Error("golden: brak gabinetów");
    admin = {
      ...base,
      permissions: [
        ...base.permissions,
        "analytics.view_network",
        "analytics.view_location",
        "analytics.view_self",
      ],
    };
    manager01 = {
      staffId: stableUuid("golden:staff:manager-test"),
      tenantId: base.tenantId,
      locationIds: [loc01],
      activeLocationId: loc01,
      role: "location_manager",
      permissions: ["analytics.view_location", "analytics.view_self", "occupancy.read"],
    };
    dentist1 = {
      staffId: stableUuid("golden:staff:prov1"),
      tenantId: base.tenantId,
      locationIds: [loc01, loc02],
      activeLocationId: loc01,
      role: "dentist",
      permissions: ["analytics.view_self", "occupancy.read"],
    };
    providerLabel = new Map(
      expected.meta.provider_keys.map((k) => [stableUuid(`golden:staff:${k}`), k]),
    );
    filters = { from: expected.meta.period.from, to: expected.meta.period.to };

    await worker.withWorker("analytics.refresh", (tx) =>
      refreshAnalytics(tx, { mode: "full", ...filters }),
    );
    clearMetricCache();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await worker.close();
  });

  async function metric(id: MetricId, actor: Actor = admin, f: MetricFilters = filters) {
    const r = await app.withActor(actor, (tx) => runMetric(tx, actor, id, f));
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.value;
  }

  it("rejestr ma 7 metryk 1.0 z kompletnym kształtem", () => {
    expect([...METRIC_IDS].sort()).toEqual(
      [
        "chair_hours_worked",
        "chair_utilization",
        "days_closed_rate",
        "provider_hours_worked",
        "revenue_by_category",
        "revenue_per_chair_hour",
        "revenue_realized",
      ].sort(),
    );
    for (const id of METRIC_IDS) {
      const m = metricRegistry[id];
      expect(m.id).toBe(id);
      expect(m.since).toBe("1.0");
      expect(m.grain.length).toBeGreaterThan(0);
      expect(m.drilldown.entity).toBe("oblozenie");
    }
  });

  it("[F0-011/AC1] chair_utilization = expected.json", async () => {
    const r = await metric("chair_utilization");
    expect(r.value).toBeCloseTo(expected.chair_utilization, 6);
  });

  it("[F0-011/AC1] chair_hours_worked = expected.json", async () => {
    expect(await metric("chair_hours_worked").then((r) => r.value)).toBe(
      expected.chair_hours_worked,
    );
  });

  it("[F0-011/AC1] revenue_realized = expected.json (co do grosza)", async () => {
    expect(await metric("revenue_realized").then((r) => r.value)).toBe(expected.revenue_realized);
  });

  it("[F0-011/AC1] revenue_per_chair_hour = expected.json", async () => {
    const r = await metric("revenue_per_chair_hour");
    expect(Math.abs((r.value as number) - expected.revenue_per_chair_hour)).toBeLessThan(TOL);
  });

  it("[F0-011/AC1] revenue_by_category = expected.json (co do grosza)", async () => {
    const r = await metric("revenue_by_category");
    expect(r.value).toEqual(expected.revenue_by_category);
  });

  it("[F0-011/AC1] provider_hours_worked = expected.json (UUID → prov1…prov5)", async () => {
    const r = await metric("provider_hours_worked");
    const byLabel: Record<string, number> = {};
    for (const [uuid, hours] of Object.entries(r.value as Record<string, number>)) {
      const label = providerLabel.get(uuid);
      expect(label, `nieznany provider ${uuid}`).toBeDefined();
      byLabel[label as string] = hours;
    }
    expect(Object.keys(byLabel).sort()).toEqual(Object.keys(expected.provider_hours_worked).sort());
    for (const [k, v] of Object.entries(expected.provider_hours_worked)) {
      expect(Math.abs((byLabel[k] ?? Number.NaN) - v)).toBeLessThan(TOL);
    }
  });

  it("[F0-011/AC1] days_closed_rate = expected.json", async () => {
    const r = await metric("days_closed_rate");
    expect(Math.abs((r.value as number) - expected.days_closed_rate)).toBeLessThan(TOL);
  });

  it("[F0-011/AC1] wynik per gabinet 01 zgodny z expected.by_location", async () => {
    const loc01 = expected.meta.locations["01"] as string;
    const r = await metric("chair_utilization", admin, { ...filters, locationIds: [loc01] });
    expect(Math.abs((r.value as number) - (expected.by_location["01"]?.chair_utilization ?? 0))).toBeLessThan(TOL);
  });

  it("[F0-011/AC4] drążenie: Σ kwot = revenue_realized, Σ minut ÷ 60 = chair_hours_worked", async () => {
    const [rev, hours] = await Promise.all([
      metric("revenue_realized"),
      metric("chair_hours_worked"),
    ]);
    const d = await app.withActor(admin, (tx) => drilldownOccupancy(tx, admin, filters));
    if (!d.ok) throw new Error(JSON.stringify(d.error));
    expect(d.value.totalAmountGrosze).toBe(rev.value);
    expect(d.value.totalHours).toBe(hours.value);
    expect(d.value.totalEntries).toBe(expected.counts.entries);

    // mianownik chair_utilization
    const util = await metric("chair_utilization");
    const c = await app.withActor(admin, (tx) => drilldownCapacity(tx, admin, filters));
    if (!c.ok) throw new Error(JSON.stringify(c.error));
    expect(c.value.totalAvailableMinutes).toBe(expected.counts.available_minutes);
    expect(d.value.totalMinutes / c.value.totalAvailableMinutes).toBeCloseTo(util.value as number, 9);
  });

  it("[F0-011/AC3] lekarz: filtr wykonawca=inny ignorowany; widzi tylko własne godziny", async () => {
    const other = stableUuid("golden:staff:prov2");
    const r = await metric("provider_hours_worked", dentist1, { ...filters, providerIds: [other] });
    const own = stableUuid("golden:staff:prov1");
    expect(Object.keys(r.value as Record<string, number>)).toEqual([own]);
    const got = (r.value as Record<string, number>)[own] ?? Number.NaN;
    expect(Math.abs(got - (expected.provider_hours_worked["prov1"] ?? Number.NaN))).toBeLessThan(TOL);
  });

  it("[F0-011/AC3] lekarz bez view_location nie liczy chair_utilization (forbidden)", async () => {
    const r = await app.withActor(dentist1, (tx) =>
      runMetric(tx, dentist1, "chair_utilization", filters),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.type).toBe("forbidden");
  });

  it("[F0-011/AC3] kierownik 01: gabinet=02 ignorowany — wynik = tylko 01", async () => {
    const loc02 = expected.meta.locations["02"] as string;
    const r = await metric("chair_utilization", manager01, { ...filters, locationIds: [loc02] });
    expect(Math.abs((r.value as number) - (expected.by_location["01"]?.chair_utilization ?? 0))).toBeLessThan(TOL);
    const d = await app.withActor(manager01, (tx) => drilldownOccupancy(tx, manager01, {
      ...filters,
      locationIds: [loc02],
    }));
    if (!d.ok) throw new Error(JSON.stringify(d.error));
    expect(d.value.rows.every((row) => row.locationId === expected.meta.locations["01"])).toBe(true);
    expect(d.value.totalEntries).toBe(expected.by_location["01"]?.entries);
  });

  it("nieznana metryka → not_found; zły okres → validation", async () => {
    const a = await app.withActor(admin, (tx) => runMetric(tx, admin, "nope", filters));
    expect(!a.ok && a.error.type).toBe("not_found");
    const b = await app.withActor(admin, (tx) =>
      runMetric(tx, admin, "revenue_realized", { from: "2026-10-31", to: "2025-10-01" }),
    );
    expect(!b.ok && b.error.type).toBe("validation");
  });

  it("cache 60 s per użytkownik: trafienie w oknie, odświeżenie po TTL", async () => {
    clearMetricCache();
    const base = instantFromIso("2026-11-25T10:00:00Z");
    let t = 0;
    const clock: Clock = { now: () => plusMs(base, t) };
    const run = (a: Actor) =>
      app.withActor(a, (tx) => runMetric(tx, a, "revenue_realized", filters, { clock }));
    const r1 = await run(admin);
    const r2 = await run(admin);
    expect(r1.ok && r2.ok && r1.value === r2.value).toBe(true);
    t += 30_000;
    const r3 = await run(admin);
    expect(r3.ok && r1.ok && r3.value === r1.value).toBe(true);
    t += 31_000;
    const r4 = await run(admin);
    expect(r4.ok && r1.ok && r4.value !== r1.value).toBe(true);
    // inny użytkownik = inny wpis
    const r5 = await run(manager01);
    expect(r5.ok && r4.ok && r5.value !== r4.value).toBe(true);
    clearMetricCache();
  });

  it("stableSerialize jest niezależne od kolejności kluczy", () => {
    expect(stableSerialize({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(
      stableSerialize({ a: [2, { c: 2, d: 1 }], b: 1 }),
    );
  });

  it("[F0-011/AC5] odświeżenie jest idempotentne (ten sam wynik po dwóch przebiegach)", async () => {
    const before = await checksum();
    for (let i = 0; i < 2; i += 1) {
      await worker.withWorker("analytics.refresh", (tx) =>
        refreshAnalytics(tx, { mode: "full", ...filters }),
      );
    }
    const after = await checksum();
    expect(after).toEqual(before);
    expect(before.counts).toBe("1980/6703/639");
  });

  it("[F0-011/AC5] refresh_log: okno 13 miesięcy, mode, liczba wierszy", async () => {
    const rows = await worker.withWorker("analytics.refresh", (tx) =>
      tx.execute(sql`
        select mode, rows_written, finished_at is not null as done,
               (window_from at time zone 'Europe/Warsaw')::date::text as w_from,
               ((window_to at time zone 'Europe/Warsaw') - interval '1 second')::date::text as w_to
        from analytics.refresh_log order by started_at desc limit 1`),
    );
    const last = rows[0] as { mode: string; rows_written: number; done: boolean; w_from: string; w_to: string };
    expect(last).toMatchObject({ mode: "full", done: true, w_from: "2025-10-01", w_to: "2026-10-31" });
    expect(last.rows_written).toBe(1980 + 6703 + 639);
  });

  it("wpis unieważniony znika z faktów po kolejnym odświeżeniu, a przyrost 1 dnia nie psuje reszty", async () => {
    const before = await metric("chair_hours_worked");
    clearMetricCache();
    const day = "2026-03-10";
    const victim = await worker.withWorker("analytics.refresh", (tx) =>
      tx.execute(sql`
        select o.id::text as id from scheduling.chair_occupancy o
        where (lower(o.period) at time zone 'Europe/Warsaw')::date = ${day}::date
          and o.voided_at is null limit 1`),
    );
    const id = (victim[0] as { id?: string } | undefined)?.id;
    expect(id).toBeDefined();
    // unieważnienie jako aktor z occupancy.void (RLS)
    await app.withActor(admin, (tx) =>
      tx.execute(sql`
        update scheduling.chair_occupancy
        set voided_at = now(), voided_by = ${admin.staffId}::uuid, void_reason = 'test K13'
        where id = ${id}::uuid`),
    );
    await worker.withWorker("analytics.refresh", (tx) =>
      refreshAnalytics(tx, { mode: "incremental", from: day, to: day }),
    );
    const after = await metric("chair_hours_worked");
    expect(before.value).toBe(expected.chair_hours_worked);
    expect(after.value).toBe(expected.chair_hours_worked - 1);
    // przywrócenie stanu wzorcowego
    await app.withActor(admin, (tx) =>
      tx.execute(sql`
        update scheduling.chair_occupancy
        set voided_at = null, voided_by = null, void_reason = null
        where id = ${id}::uuid`),
    );
    await worker.withWorker("analytics.refresh", (tx) =>
      refreshAnalytics(tx, { mode: "incremental", from: day, to: day }),
    );
    clearMetricCache();
    expect((await metric("chair_hours_worked")).value).toBe(expected.chair_hours_worked);
  });
});
