import type { Actor, Tx } from "@crux/db";
import { NO_PROVIDER_KEY } from "@crux/db/schema";
import { instantFromIso } from "@crux/shared/time";
import { ok, type DomainError, type Result } from "@crux/shared/result";
import { sql } from "drizzle-orm";
import { prepare } from "../metrics/drilldown";
import { actorScope } from "../metrics/scope";
import { capacityWhere, num, occupancyWhere, query, viewFor } from "../metrics/sql";
import type { MetricFilters } from "../metrics/types";

/**
 * Zapytania pomocnicze pulpitów 1.0 (K14): wykresy, które nie mieszczą się w jednej wartości metryki.
 * Czytają WYŁĄCZNIE `analytics.*` (widoki per rola + wymiary); autoryzacja i przycięcie filtrów
 * jak w `runMetric` / drążeniu.
 */

export type DashboardLocation = {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly colorKey: string;
};

/**
 * Gabinety widoczne dla aktora. Wymiary są tenantowe (RLS nie zawęża do członkostwa),
 * więc poza zakresem `network` lista jest przycinana do członkostw aktora.
 */
export async function listDashboardLocations(
  tx: Tx,
  actor: Actor,
): Promise<readonly DashboardLocation[]> {
  const rows = await query(tx, sql`
    select l.location_key, l.number, l.name, l.color_key
    from analytics.dim_location l
    where l.tenant_id = ${actor.tenantId}::uuid and l.active
    order by l.number`);
  const network = actorScope(actor) === "network";
  const allowed = new Set(actor.locationIds);
  return rows
    .filter((r) => network || allowed.has(String(r["location_key"])))
    .map((r) => ({
    id: String(r["location_key"]),
    number: String(r["number"]),
    name: String(r["name"]),
    colorKey: String(r["color_key"]),
  }));
}

export type DashboardChair = { readonly id: string; readonly name: string; readonly locationId: string };

/** Nazwy foteli (słownik; bez danych osobowych) do czytelnych list drążenia. */
export async function listDashboardChairs(tx: Tx, actor: Actor): Promise<readonly DashboardChair[]> {
  const rows = await query(tx, sql`
    select c.chair_key, c.name, c.location_key
    from analytics.dim_chair c
    where c.tenant_id = ${actor.tenantId}::uuid
    order by c.location_key, c.position`);
  return rows.map((r) => ({
    id: String(r["chair_key"]),
    name: String(r["name"]),
    locationId: String(r["location_key"]),
  }));
}

export type DashboardProvider = { readonly id: string; readonly displayName: string };

/** Wykonawcy z wpisami w zakresie aktora (do filtra „wykonawca”); widok per rola ogranicza wiersze. */
export async function listDashboardProviders(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly DashboardProvider[], DomainError>> {
  const p = await prepare(tx, actor, { ...filters, providerIds: [], categories: [] }, "analytics.view_self");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select o.provider_key, coalesce(pr.display_name, 'Wykonawca') as display_name
    from ${viewFor("occupancy", p.value.scope)} o
    left join analytics.dim_provider pr on pr.provider_key = o.provider_key
    where ${occupancyWhere("o", p.value)} and o.provider_key <> ${NO_PROVIDER_KEY}::uuid
    group by o.provider_key, pr.display_name
    order by pr.display_name, o.provider_key`);
  return ok(rows.map((r) => ({ id: String(r["provider_key"]), displayName: String(r["display_name"]) })));
}

export type WeeklyRevenueRow = {
  readonly weekStart: string;
  readonly isoWeek: number;
  readonly locationId: string;
  readonly amountGrosze: number;
};

/** `revenue_realized` tygodniowo (poniedziałek ISO) per gabinet. */
export async function queryWeeklyRevenue(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly WeeklyRevenueRow[], DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_self");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select w.week_start::text as week_start, extract(week from w.week_start)::int as iso_week,
           w.location_id, w.amount
    from (
      select date_trunc('week', o.date_key)::date as week_start, o.location_id,
             coalesce(sum(o.amount_grosze), 0) as amount
      from ${viewFor("occupancy", p.value.scope)} o
      where ${occupancyWhere("o", p.value)}
      group by 1, 2
    ) w
    order by w.week_start, w.location_id`);
  return ok(
    rows.map((r) => ({
      weekStart: String(r["week_start"]),
      isoWeek: num(r["iso_week"]),
      locationId: String(r["location_id"]),
      amountGrosze: num(r["amount"]),
    })),
  );
}

export type LocationBreakdownRow = {
  readonly locationId: string;
  readonly occupiedMinutes: number;
  readonly availableMinutes: number;
  readonly amountGrosze: number;
  readonly workingDays: number;
  readonly closedDays: number;
};

/** Obłożenie, przychód i zamknięcia per gabinet (łuki, wykres kropkowy). Wymaga `view_location`. */
export async function queryLocationBreakdown(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly LocationBreakdownRow[], DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_location");
  if (!p.ok) return p;
  const scope = p.value.scope;
  const occ = await query(tx, sql`
    select o.location_id, coalesce(sum(o.occupied_minutes), 0) as minutes,
           coalesce(sum(o.amount_grosze), 0) as amount
    from ${viewFor("occupancy", scope)} o
    where ${occupancyWhere("o", p.value)}
    group by o.location_id`);
  const cap = await query(tx, sql`
    select c.location_id, coalesce(sum(c.available_minutes), 0) as available
    from ${viewFor("capacity", scope)} c
    where ${capacityWhere("c", p.value)}
    group by c.location_id`);
  const days = await query(tx, sql`
    with wd as (
      select c.location_id, c.date_key
      from ${viewFor("capacity", scope)} c
      where ${capacityWhere("c", p.value)} and c.open_minutes > 0
      group by c.location_id, c.date_key
    )
    select wd.location_id, count(*) as working_days,
           count(*) filter (where exists (
             select 1 from ${viewFor("closures", scope)} x
             where x.location_id = wd.location_id and x.date_key = wd.date_key and x.closed
           )) as closed_days
    from wd group by wd.location_id`);

  const ids = new Set<string>([
    ...occ.map((r) => String(r["location_id"])),
    ...cap.map((r) => String(r["location_id"])),
    ...days.map((r) => String(r["location_id"])),
  ]);
  const byId = (rows: typeof occ, id: string) => rows.find((r) => String(r["location_id"]) === id);
  return ok(
    [...ids].sort().map((id) => ({
      locationId: id,
      occupiedMinutes: num(byId(occ, id)?.["minutes"]),
      amountGrosze: num(byId(occ, id)?.["amount"]),
      availableMinutes: num(byId(cap, id)?.["available"]),
      workingDays: num(byId(days, id)?.["working_days"]),
      closedDays: num(byId(days, id)?.["closed_days"]),
    })),
  );
}

export type DailyUtilizationRow = {
  readonly dateKey: string;
  readonly occupiedMinutes: number;
  /** null: zakres `self` nie widzi pojemności. */
  readonly availableMinutes: number | null;
};

/** Rytm dni (kalendarz kuleczek): minuty wpisów i (od `view_location`) dostępne minuty per dzień. */
export async function queryDailyUtilization(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly DailyUtilizationRow[], DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_self");
  if (!p.ok) return p;
  const scope = p.value.scope;
  const occ = await query(tx, sql`
    select o.date_key::text as date_key, sum(o.occupied_minutes) as minutes
    from ${viewFor("occupancy", scope)} o
    where ${occupancyWhere("o", p.value)}
    group by o.date_key`);
  const map = new Map<string, { occ: number; avail: number | null }>();
  for (const r of occ) map.set(String(r["date_key"]), { occ: num(r["minutes"]), avail: null });

  if (scope !== "self") {
    const cap = await query(tx, sql`
      select c.date_key::text as date_key, sum(c.available_minutes) as available
      from ${viewFor("capacity", scope)} c
      where ${capacityWhere("c", p.value)}
      group by c.date_key`);
    for (const [, v] of map) v.avail = 0;
    for (const r of cap) {
      const key = String(r["date_key"]);
      const cur = map.get(key) ?? { occ: 0, avail: 0 };
      cur.avail = num(r["available"]);
      map.set(key, cur);
    }
  }
  return ok(
    [...map.entries()]
      .filter(([, v]) => v.occ > 0 || (v.avail ?? 0) > 0)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([dateKey, v]) => ({
        dateKey,
        occupiedMinutes: v.occ,
        availableMinutes: v.avail,
      })),
  );
}

export type ChairHoursRow = {
  readonly chairKey: string;
  readonly chairName: string;
  readonly locationId: string;
  readonly minutes: number;
};

/** Godziny wpisów per fotel (słupki). */
export async function queryHoursByChair(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly ChairHoursRow[], DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_self");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select o.chair_key, coalesce(ch.name, 'Fotel') as chair_name, o.location_id,
           sum(o.occupied_minutes) as minutes, min(ch.position) as position
    from ${viewFor("occupancy", p.value.scope)} o
    left join analytics.dim_chair ch on ch.chair_key = o.chair_key
    where ${occupancyWhere("o", p.value)}
    group by o.chair_key, ch.name, o.location_id
    order by o.location_id, min(ch.position), o.chair_key`);
  return ok(
    rows.map((r) => ({
      chairKey: String(r["chair_key"]),
      chairName: String(r["chair_name"]),
      locationId: String(r["location_id"]),
      minutes: num(r["minutes"]),
    })),
  );
}

export type ProviderBreakdownRow = {
  readonly providerKey: string;
  readonly displayName: string;
  readonly minutes: number;
  readonly amountGrosze: number;
};

/** Tabela wykonawców: godziny, kwota (wpisy bez wykonawcy pominięte, jak `provider_hours_worked`). */
export async function queryProviderBreakdown(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
): Promise<Result<readonly ProviderBreakdownRow[], DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_self");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select o.provider_key, coalesce(pr.display_name, 'Wykonawca') as display_name,
           sum(o.occupied_minutes) as minutes, coalesce(sum(o.amount_grosze), 0) as amount
    from ${viewFor("occupancy", p.value.scope)} o
    left join analytics.dim_provider pr on pr.provider_key = o.provider_key
    where ${occupancyWhere("o", p.value)} and o.provider_key <> ${NO_PROVIDER_KEY}::uuid
    group by o.provider_key, pr.display_name
    order by sum(o.occupied_minutes) desc, o.provider_key`);
  return ok(
    rows.map((r) => ({
      providerKey: String(r["provider_key"]),
      displayName: String(r["display_name"]),
      minutes: num(r["minutes"]),
      amountGrosze: num(r["amount"]),
    })),
  );
}

export type UnclosedDay = { readonly locationId: string; readonly dateKey: string };

/**
 * Dni robocze (otwarcie > 0 min) bez zamknięcia — te same dni, których brakuje w `days_closed_rate`.
 * Wymaga `view_location`. `total` = liczba wszystkich, `days` = najnowsze `limit`.
 */
export async function listUnclosedDays(
  tx: Tx,
  actor: Actor,
  filters: MetricFilters,
  limit = 60,
): Promise<Result<{ days: readonly UnclosedDay[]; total: number }, DomainError>> {
  const p = await prepare(tx, actor, filters, "analytics.view_location");
  if (!p.ok) return p;
  const rows = await query(tx, sql`
    select u.location_id, u.date_key::text as date_key, count(*) over () as total
    from (
      select c.location_id, c.date_key
      from ${viewFor("capacity", p.value.scope)} c
      where ${capacityWhere("c", p.value)} and c.open_minutes > 0
        and not exists (
          select 1 from ${viewFor("closures", p.value.scope)} x
          where x.location_id = c.location_id and x.date_key = c.date_key and x.closed
        )
      group by c.location_id, c.date_key
    ) u
    order by u.date_key desc, u.location_id
    limit ${limit}`);
  return ok({
    total: num(rows[0]?.["total"]),
    days: rows.map((r) => ({ locationId: String(r["location_id"]), dateKey: String(r["date_key"]) })),
  });
}

/** Najnowsze zakończone odświeżenie schematu (stopka „odświeżono”). */
export async function latestRefreshAt(tx: Tx): Promise<Date | null> {
  const rows = await query(tx, sql`
    select max(finished_at) as finished_at from analytics.refresh_log`);
  const v = rows[0]?.["finished_at"];
  if (v instanceof Date) return v;
  return typeof v === "string" ? instantFromIso(v) : null;
}
