import type { Actor, Tx } from "@crux/db";
import { authorize } from "@crux/identity";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { sql } from "drizzle-orm";
import { actorScope, clampFilters, satisfies } from "./scope";
import { capacityWhere, num, occupancyWhere, query, viewFor } from "./sql";
import type { ClampedFilters, MetricFilters, MetricParams } from "./types";

export type OccupancyDrilldownRow = {
  readonly locationId: string;
  readonly chairKey: string;
  readonly dateKey: string;
  readonly providerKey: string;
  readonly categoryKey: string;
  readonly source: string;
  readonly occupiedMinutes: number;
  readonly amountGrosze: number;
  readonly entries: number;
};

export type OccupancyDrilldown = {
  readonly rows: readonly OccupancyDrilldownRow[];
  /** Sumy kontrolne: Σ minut ÷ 60 = chair_hours_worked; Σ kwot = revenue_realized. */
  readonly totalMinutes: number;
  readonly totalHours: number;
  readonly totalAmountGrosze: number;
  readonly totalEntries: number;
  readonly filters: ClampedFilters;
};

export async function prepare(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
  required: "analytics.view_self" | "analytics.view_location",
): Promise<Result<MetricParams, DomainError>> {
  const scope = actorScope(actor);
  if (scope === null || !satisfies(scope, required)) {
    const denied = await authorize(tx, actor, required);
    if (!denied.ok) return denied;
    return err({ type: "forbidden", details: { reason: required } });
  }
  const clamped = clampFilters(actor, scope, filters);
  if (!clamped.ok) return clamped;
  return ok({ ...clamped.value, tenantId: actor.tenantId, scope });
}

/**
 * Drążenie `/lista/oblozenie` — wiersze faktu obłożenia (licznik), z których powstają
 * `revenue_realized` i `chair_hours_worked`. Uprawnienia i przycięcie filtrów jak w metrykach.
 */
export async function drilldownOccupancy(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<OccupancyDrilldown, DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_self");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select o.location_id, o.chair_key, o.date_key::text as date_key, o.provider_key,
           o.category_key, o.source::text as source, o.occupied_minutes,
           o.amount_grosze, o.entries
    from ${viewFor("occupancy", p.value.scope)} o
    where ${occupancyWhere("o", p.value)}
    order by o.date_key, o.location_id, o.chair_key, o.provider_key, o.category_key, o.source`);

  const mapped = rows.map(
    (r): OccupancyDrilldownRow => ({
      locationId: String(r["location_id"]),
      chairKey: String(r["chair_key"]),
      dateKey: String(r["date_key"]),
      providerKey: String(r["provider_key"]),
      categoryKey: String(r["category_key"]),
      source: String(r["source"]),
      occupiedMinutes: num(r["occupied_minutes"]),
      amountGrosze: num(r["amount_grosze"]),
      entries: num(r["entries"]),
    }),
  );
  const totalMinutes = mapped.reduce((s, r) => s + r.occupiedMinutes, 0);
  return ok({
    rows: mapped,
    totalMinutes,
    totalHours: totalMinutes / 60,
    totalAmountGrosze: mapped.reduce((s, r) => s + r.amountGrosze, 0),
    totalEntries: mapped.reduce((s, r) => s + r.entries, 0),
    filters: {
      from: p.value.from,
      to: p.value.to,
      locationIds: p.value.locationIds,
      providerIds: p.value.providerIds,
      categories: p.value.categories,
    },
  });
}

export type CapacityDrilldownRow = {
  readonly locationId: string;
  readonly chairKey: string;
  readonly dateKey: string;
  readonly openMinutes: number;
  readonly blockedMinutes: number;
  readonly availableMinutes: number;
};

/** Mianownik `chair_utilization`: pojemność per fotel i dzień (Σ available = mianownik). */
export async function drilldownCapacity(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<
  Result<{ rows: readonly CapacityDrilldownRow[]; totalAvailableMinutes: number }, DomainError>
> {
  const p = await prepare(tx, actor, filters, "analytics.view_location");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select c.location_id, c.chair_key, c.date_key::text as date_key,
           c.open_minutes, c.blocked_minutes, c.available_minutes
    from ${viewFor("capacity", p.value.scope)} c
    where ${capacityWhere("c", p.value)}
    order by c.date_key, c.location_id, c.chair_key`);
  const mapped = rows.map(
    (r): CapacityDrilldownRow => ({
      locationId: String(r["location_id"]),
      chairKey: String(r["chair_key"]),
      dateKey: String(r["date_key"]),
      openMinutes: num(r["open_minutes"]),
      blockedMinutes: num(r["blocked_minutes"]),
      availableMinutes: num(r["available_minutes"]),
    }),
  );
  return ok({
    rows: mapped,
    totalAvailableMinutes: mapped.reduce((s, r) => s + r.availableMinutes, 0),
  });
}
