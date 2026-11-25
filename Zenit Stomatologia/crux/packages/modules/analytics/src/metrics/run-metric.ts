import type { Actor, Tx } from "@crux/db";
import { authorize } from "@crux/identity";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { systemClock, type Clock } from "@crux/shared/time";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet, stableSerialize } from "./cache";
import { isMetricId, metricRegistry } from "./registry";
import { actorScope, clampFilters, satisfies } from "./scope";
import { query, viewFor } from "./sql";
import type { MetricFilters, MetricParams, MetricResult } from "./types";

export type RunMetricOptions = { readonly clock?: Clock };

/**
 * Uruchamia metrykę z rejestru: autoryzacja → przycięcie filtrów → cache 60 s → SQL na `analytics.*`.
 * Cache: wyłącznie per użytkownik (tenant, rola, staff, id, filtry) — brak współdzielenia (ADR-030).
 */
export async function runMetric(
  tx: Tx,
  actor: Actor,
  id: string,
  filters: MetricFilters,
  options: RunMetricOptions = {},
): Promise<Result<MetricResult, DomainError>> {
  if (!isMetricId(id)) return err({ type: "not_found", details: { entity: "metric", id } });
  const def = metricRegistry[id];
  const clock = options.clock ?? systemClock;

  const scope = actorScope(actor);
  if (scope === null || !satisfies(scope, def.permission)) {
    const denied = await authorize(tx, actor, def.permission); // audyt odmowy
    if (!denied.ok) return denied;
    return err({ type: "forbidden", details: { reason: def.permission } });
  }

  const clamped = clampFilters(actor, scope, filters);
  if (!clamped.ok) return clamped;

  const key = stableSerialize({
    t: actor.tenantId,
    r: actor.role,
    s: actor.staffId,
    l: [...actor.locationIds].sort(),
    id,
    f: clamped.value,
  });
  const cached = cacheGet(key, clock);
  if (cached) return ok(cached);

  const params: MetricParams = { ...clamped.value, tenantId: actor.tenantId, scope };
  const rows = await query(tx, def.sql(params));
  const freshness = await query(tx, sql`
    select max(o.refreshed_at) as refreshed_at
    from ${viewFor("occupancy", scope)} o
    where o.tenant_id = ${actor.tenantId}::uuid`);

  const result: MetricResult = {
    id,
    value: def.map(rows),
    unit: def.unit,
    refreshedAt: toIso(freshness[0]?.["refreshed_at"]),
    drilldown: { entity: def.drilldown.entity, metric: id, filters: clamped.value },
  };
  cacheSet(key, result, clock);
  return ok(result);
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : null;
}
