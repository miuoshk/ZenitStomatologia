import { NO_PROVIDER_KEY } from "@crux/db/schema";
import type { Tx } from "@crux/db";
import { TZ, plainDate } from "@crux/shared/time";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

const PlainDateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => plainDate(v));

const RefreshOptionsSchema = z
  .object({
    mode: z.enum(["incremental", "full"]),
    tenantId: z.uuid().optional(),
    locationId: z.uuid().optional(),
    from: PlainDateInput,
    to: PlainDateInput,
  })
  .refine((o) => o.from <= o.to, { error: "from > to", path: ["from"] });

export type RefreshOptions = z.input<typeof RefreshOptionsSchema>;

export type RefreshResult = {
  readonly logId: string;
  readonly rowsWritten: number;
  readonly capacityRows: number;
  readonly occupancyRows: number;
  readonly closureRows: number;
};

/**
 * Odświeża schemat `analytics` z danych operacyjnych (scheduling + org + identity).
 * Wywoływać wyłącznie w `db.withWorker('analytics.refresh', …)` — polityki RLS pozwalają
 * workerowi czytać źródła i pisać fakty tylko w tej operacji.
 *
 * Idempotentne: w oknie i zakresie (tenant/gabinet) fakty są usuwane i zapisywane od nowa
 * (upsert po kluczu naturalnym), więc unieważnione wpisy znikają, a powtórka daje ten sam wynik.
 * Dzień lokalny = Europe/Warsaw; wpis należy do dnia początku swojego przedziału.
 */
export async function refreshAnalytics(tx: Tx, options: RefreshOptions): Promise<RefreshResult> {
  const o = RefreshOptionsSchema.parse(options);
  const tenant = o.tenantId ?? null;
  const location = o.locationId ?? null;
  const from = o.from;
  const to = o.to;

  const scope = (t: string, l: string | null): SQL =>
    l === null
      ? sql`(${tenant}::uuid is null or ${sql.raw(t)}.tenant_id = ${tenant}::uuid)`
      : sql`(${tenant}::uuid is null or ${sql.raw(t)}.tenant_id = ${tenant}::uuid)
            and ${sql.raw(l)} = ${location}::uuid`;
  const locScope = (t: string, col: string): SQL =>
    location === null ? scope(t, null) : scope(t, `${t}.${col}`);

  const logRows = await tx.execute(sql`
    insert into analytics.refresh_log (window_from, window_to, started_at, mode)
    values (
      ${from}::date::timestamp at time zone ${TZ},
      (${to}::date + 1)::timestamp at time zone ${TZ},
      now(), ${o.mode}
    )
    returning id`);
  const logId = (logRows[0] as { id: string } | undefined)?.id;
  if (!logId) throw new Error("refresh_log: brak id");

  // --- Wymiary ---------------------------------------------------------------
  await tx.execute(sql`
    insert into analytics.dim_location (location_key, tenant_id, number, name, color_key, active)
    select l.id, l.tenant_id, l.number, l.name, l.color_key, l.active
    from org.locations l where ${locScope("l", "id")}
    on conflict (location_key) do update set
      tenant_id = excluded.tenant_id, number = excluded.number, name = excluded.name,
      color_key = excluded.color_key, active = excluded.active`);
  await tx.execute(sql`
    insert into analytics.dim_chair (chair_key, tenant_id, location_key, name, position, active)
    select c.id, c.tenant_id, c.location_id, c.name, c.position, c.active
    from org.chairs c where ${locScope("c", "location_id")}
    on conflict (chair_key) do update set
      tenant_id = excluded.tenant_id, location_key = excluded.location_key, name = excluded.name,
      position = excluded.position, active = excluded.active`);
  // display_name = jedyne pole imienne w analytics (dane pracownicze, bez kontaktu)
  await tx.execute(sql`
    insert into analytics.dim_provider (provider_key, tenant_id, display_name, title, role)
    select s.id, s.tenant_id,
      coalesce(nullif(s.display_name, ''), s.first_name || ' ' || s.last_name),
      s.title,
      coalesce((
        select m.role::text from identity.memberships m
        where m.staff_id = s.id order by m.starts_on, m.role::text limit 1
      ), 'unassigned')
    from identity.staff_members s where ${scope("s", null)}
    on conflict (provider_key) do update set
      tenant_id = excluded.tenant_id, display_name = excluded.display_name,
      title = excluded.title, role = excluded.role`);

  // --- Pojemność: fotel × dzień ----------------------------------------------
  await tx.execute(sql`
    delete from analytics.fact_chair_capacity f
    where ${locScope("f", "location_id")} and f.date_key between ${from}::date and ${to}::date`);
  const capacity = await tx.execute(sql`
    with days as (
      select g::date as day from generate_series(${from}::date, ${to}::date, interval '1 day') g
    ),
    sc as (
      select c.id as chair_id, c.tenant_id, c.location_id
      from org.chairs c where c.active and ${locScope("c", "location_id")}
    ),
    loc_days as (
      select l.id as location_id, d.day, ex.id as ex_id, ex.closed,
             ex.opens as eo, ex.closes as ec
      from org.locations l
      cross join days d
      left join org.opening_exceptions ex on ex.location_id = l.id and ex.day = d.day
      where ${locScope("l", "id")}
    ),
    ranges as (
      select ld.location_id, ld.day, ld.eo as opens, ld.ec as closes
      from loc_days ld
      where ld.ex_id is not null and not ld.closed and ld.eo is not null and ld.ec is not null
      union all
      select ld.location_id, ld.day, h.opens, h.closes
      from loc_days ld
      join org.opening_hours h
        on h.location_id = ld.location_id
       and h.weekday = extract(isodow from ld.day)::int
       and h.valid_from <= ld.day
       and (h.valid_to is null or h.valid_to >= ld.day)
      where ld.ex_id is null or (not ld.closed and (ld.eo is null or ld.ec is null))
    ),
    chair_ranges as (
      select sc.chair_id, r.day,
        tstzrange((r.day + r.opens) at time zone ${TZ}, (r.day + r.closes) at time zone ${TZ}) as rng
      from sc join ranges r on r.location_id = sc.location_id
    ),
    open_agg as (
      select chair_id, day, sum(extract(epoch from upper(rng) - lower(rng)) / 60) as m
      from chair_ranges group by chair_id, day
    ),
    blocked as (
      select chair_id, day, sum(extract(epoch from upper(x) - lower(x)) / 60) as m
      from (
        select cr.chair_id, cr.day, unnest(range_agg(b.period * cr.rng)) as x
        from chair_ranges cr
        join scheduling.time_blocks b
          on b.chair_id = cr.chair_id and b.ended_at is null and b.period && cr.rng
        group by cr.chair_id, cr.day
      ) s
      group by chair_id, day
    )
    insert into analytics.fact_chair_capacity
      (tenant_id, location_id, chair_key, date_key, open_minutes, blocked_minutes,
       available_minutes, refreshed_at)
    select sc.tenant_id, sc.location_id, sc.chair_id, d.day,
      round(coalesce(oa.m, 0))::int,
      round(coalesce(bl.m, 0))::int,
      round(coalesce(oa.m, 0))::int - round(coalesce(bl.m, 0))::int,
      now()
    from sc
    cross join days d
    left join open_agg oa on oa.chair_id = sc.chair_id and oa.day = d.day
    left join blocked bl on bl.chair_id = sc.chair_id and bl.day = d.day
    on conflict (chair_key, date_key) do update set
      tenant_id = excluded.tenant_id, location_id = excluded.location_id,
      open_minutes = excluded.open_minutes, blocked_minutes = excluded.blocked_minutes,
      available_minutes = excluded.available_minutes, refreshed_at = excluded.refreshed_at
    returning 1`);

  // --- Obłożenie: fotel × dzień × wykonawca × kategoria × źródło -----------------
  await tx.execute(sql`
    delete from analytics.fact_chair_occupancy f
    where ${locScope("f", "location_id")} and f.date_key between ${from}::date and ${to}::date`);
  const occupancy = await tx.execute(sql`
    insert into analytics.fact_chair_occupancy
      (tenant_id, location_id, chair_key, date_key, provider_key, category_key,
       occupied_minutes, amount_grosze, entries, source, refreshed_at)
    select o.tenant_id, o.location_id, o.chair_id,
      (lower(o.period) at time zone ${TZ})::date as date_key,
      coalesce(o.provider_id, ${NO_PROVIDER_KEY}::uuid),
      o.category,
      round(sum(extract(epoch from upper(o.period) - lower(o.period)) / 60))::int,
      coalesce(sum(o.amount_grosze), 0)::bigint,
      count(*)::int,
      o.source,
      now()
    from scheduling.chair_occupancy o
    where o.voided_at is null
      and ${locScope("o", "location_id")}
      and (lower(o.period) at time zone ${TZ})::date between ${from}::date and ${to}::date
    group by 1, 2, 3, 4, 5, 6, 10
    on conflict (chair_key, date_key, provider_key, category_key, source) do update set
      tenant_id = excluded.tenant_id, location_id = excluded.location_id,
      occupied_minutes = excluded.occupied_minutes, amount_grosze = excluded.amount_grosze,
      entries = excluded.entries, refreshed_at = excluded.refreshed_at
    returning 1`);

  // --- Zamknięcia dni ------------------------------------------------------------
  await tx.execute(sql`
    delete from analytics.fact_day_closures f
    where ${locScope("f", "location_id")} and f.date_key between ${from}::date and ${to}::date`);
  const closures = await tx.execute(sql`
    insert into analytics.fact_day_closures
      (tenant_id, location_id, date_key, closed, closed_at, refreshed_at)
    select c.tenant_id, c.location_id, c.day, c.reopened_at is null,
      case when c.reopened_at is null then c.closed_at end, now()
    from scheduling.occupancy_day_closures c
    where ${locScope("c", "location_id")} and c.day between ${from}::date and ${to}::date
    on conflict (location_id, date_key) do update set
      tenant_id = excluded.tenant_id, closed = excluded.closed,
      closed_at = excluded.closed_at, refreshed_at = excluded.refreshed_at
    returning 1`);

  const rowsWritten = capacity.length + occupancy.length + closures.length;
  await tx.execute(sql`
    update analytics.refresh_log
    set finished_at = clock_timestamp(), rows_written = ${rowsWritten}
    where id = ${logId}::uuid`);

  return {
    logId,
    rowsWritten,
    capacityRows: capacity.length,
    occupancyRows: occupancy.length,
    closureRows: closures.length,
  };
}
