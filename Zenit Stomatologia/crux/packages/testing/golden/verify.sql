-- K12 · golden/verify.sql — NAIWNE, niezależne od kodu TS obliczenie metryk golden datasetu.
-- Czyta wyłącznie scheduling.* oraz org.* (fakty analytics powstaną w K13).
-- Uruchomienie:  psql "$DATABASE_URL" -X -A -t -f packages/testing/golden/verify.sql
-- (jako superuser/właściciel — omija RLS; `pnpm --filter @crux/testing verify:golden`
--  wykonuje to samo zapytanie przez withActor i porównuje z expected.json).
-- Parametry (hardcode golden): tenant, okres 2025-10-01 … 2026-10-31.

with p as (
  select
    'e73ad5fa-5fc7-5035-86eb-01a1b04172a3'::uuid as tid,
    date '2025-10-01' as d_from,
    date '2026-10-31' as d_to
),
days as (
  select g::date as day
  from p, generate_series(p.d_from, p.d_to, interval '1 day') g
),
-- gabinet × dzień z godzinami otwarcia (bez wyjątków „zamknięte”)
loc_days as (
  select l.id as location_id, l.number, d.day, h.opens, h.closes
  from p
  cross join days d
  join org.locations l on l.tenant_id = p.tid
  join org.opening_hours h
    on h.tenant_id = p.tid
   and h.location_id = l.id
   and h.weekday = extract(isodow from d.day)::int
   and h.valid_from <= d.day
   and (h.valid_to is null or h.valid_to >= d.day)
  where not exists (
    select 1 from org.opening_exceptions x
    where x.location_id = l.id and x.day = d.day and x.closed
  )
),
chair_days as (
  select
    ld.location_id, ld.day, c.id as chair_id,
    tstzrange(
      (ld.day + ld.opens) at time zone 'Europe/Warsaw',
      (ld.day + ld.closes) at time zone 'Europe/Warsaw'
    ) as open_range
  from loc_days ld
  join org.chairs c on c.location_id = ld.location_id and c.active
),
open_minutes as (
  select coalesce(sum(extract(epoch from upper(open_range) - lower(open_range)) / 60), 0) as m
  from chair_days
),
blocked_minutes as (
  select coalesce(sum(
    extract(epoch from upper(b.period * cd.open_range) - lower(b.period * cd.open_range)) / 60
  ), 0) as m
  from chair_days cd
  join scheduling.time_blocks b
    on b.chair_id = cd.chair_id
   and b.ended_at is null
   and b.period && cd.open_range
),
occ as (
  select co.*
  from scheduling.chair_occupancy co, p
  where co.tenant_id = p.tid
    and co.voided_at is null
    and co.period && tstzrange(
      p.d_from::timestamp at time zone 'Europe/Warsaw',
      (p.d_to + 1)::timestamp at time zone 'Europe/Warsaw'
    )
),
occ_tot as (
  select
    count(*) as entries,
    coalesce(sum(extract(epoch from upper(period) - lower(period)) / 60), 0) as minutes,
    coalesce(sum(amount_grosze), 0) as revenue
  from occ
),
by_cat as (
  select k.cat, coalesce(sum(o.amount_grosze), 0) as revenue
  from (values ('Z1'), ('Z2'), ('Z3'), ('Z4'), ('Z5'), ('Z+')) as k(cat)
  left join occ o on o.category = k.cat
  group by k.cat
),
by_provider as (
  select split_part(s.email, '@', 1) as provider_key,
         sum(extract(epoch from upper(o.period) - lower(o.period)) / 3600) as hours
  from occ o
  join identity.staff_members s on s.id = o.provider_id
  group by 1
),
closures as (
  select count(*) as n
  from scheduling.occupancy_day_closures c
  join loc_days ld on ld.location_id = c.location_id and ld.day = c.day
  where c.reopened_at is null
),
n_blocks as (
  select count(*) as n from scheduling.time_blocks b, p
  where b.tenant_id = p.tid and b.ended_at is null
)
select jsonb_pretty(jsonb_build_object(
  'chair_utilization',
    (select t.minutes from occ_tot t) / ((select m from open_minutes) - (select m from blocked_minutes)),
  'chair_hours_worked', (select t.minutes from occ_tot t) / 60,
  'revenue_realized', (select t.revenue from occ_tot t),
  'revenue_per_chair_hour', (select t.revenue from occ_tot t) / ((select t.minutes from occ_tot t) / 60),
  'revenue_by_category', (select jsonb_object_agg(cat, revenue) from by_cat),
  'provider_hours_worked', (select jsonb_object_agg(provider_key, hours) from by_provider),
  'days_closed_rate', (select n from closures)::numeric / (select count(*) from loc_days),
  'counts', jsonb_build_object(
    'entries', (select entries from occ_tot),
    'time_blocks', (select n from n_blocks),
    'day_closures', (select n from closures),
    'working_location_days', (select count(*) from loc_days),
    'available_minutes', (select m from open_minutes) - (select m from blocked_minutes),
    'occupied_minutes', (select minutes from occ_tot)
  )
)) as result;
