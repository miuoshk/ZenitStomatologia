-- K13 · analytics 1.0: wymiary, fakty, widoki per rola, RLS (F0-011, docs/03a §12.1)
-- Schemat `analytics` istnieje od 0001; tu tylko obiekty. Fakty są w pełni odtwarzalne z danych
-- operacyjnych (worker `analytics.refresh`). Żadnych danych osobowych pacjentów.
-- `dim_provider` zawiera wyłącznie display_name/title/role (bez imienia, nazwiska, kontaktu).

-- ---------------------------------------------------------------------------
-- Claims workera (nie security definer): operacja z `request.jwt.claims`
-- ---------------------------------------------------------------------------
create or replace function extensions.worker_operation()
returns text
language plpgsql
stable
parallel safe
as $$
declare
  raw text := current_setting('request.jwt.claims', true);
  claims jsonb;
begin
  if raw is null or raw = '' then
    return null;
  end if;
  begin
    claims := raw::jsonb;
  exception when others then
    return null;
  end;
  if coalesce(claims ->> 'worker', 'false') <> 'true' then
    return null;
  end if;
  return nullif(claims ->> 'operation', '');
end;
$$;

revoke all on function extensions.worker_operation() from public;
grant execute on function extensions.worker_operation() to authenticated, crux_app, crux_worker;

-- ---------------------------------------------------------------------------
-- Święta państwowe PL (stałe + ruchome z Wielkanocy; algorytm anonimowy gregoriański)
-- ---------------------------------------------------------------------------
create or replace function analytics.easter_sunday(p_year int)
returns date
language plpgsql
immutable
parallel safe
as $$
declare
  a int := p_year % 19;
  b int := p_year / 100;
  c int := p_year % 100;
  d int := b / 4;
  e int := b % 4;
  f int := (b + 8) / 25;
  g int := (b - f + 1) / 3;
  h int := (19 * a + b - d - g + 15) % 30;
  i int := c / 4;
  k int := c % 4;
  l int := (32 + 2 * e + 2 * i - h - k) % 7;
  m int := (a + 11 * h + 22 * l) / 451;
  mo int := (h + l - 7 * m + 114) / 31;
  da int := ((h + l - 7 * m + 114) % 31) + 1;
begin
  return make_date(p_year, mo, da);
end;
$$;

create or replace function analytics.is_pl_holiday(p_day date)
returns boolean
language plpgsql
immutable
parallel safe
as $$
declare
  y int := extract(year from p_day)::int;
  easter date := analytics.easter_sunday(y);
  md int := extract(month from p_day)::int * 100 + extract(day from p_day)::int;
begin
  -- Stałe: 1.01, 6.01, 1.05, 3.05, 15.08, 1.11, 11.11, 25.12, 26.12
  if md in (101, 106, 501, 503, 815, 1101, 1111, 1225, 1226) then
    return true;
  end if;
  -- Wigilia wolna od pracy od 2025 r.
  if md = 1224 and y >= 2025 then
    return true;
  end if;
  -- Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki (+49), Boże Ciało (+60)
  if p_day in (easter, easter + 1, easter + 49, easter + 60) then
    return true;
  end if;
  return false;
end;
$$;

grant execute on function analytics.easter_sunday(int), analytics.is_pl_holiday(date)
  to authenticated, crux_app, crux_worker;

-- ---------------------------------------------------------------------------
-- Wymiary
-- ---------------------------------------------------------------------------
create table analytics.dim_date (
  date_key date primary key,
  iso_week int not null,
  iso_year int not null,
  month int not null,
  quarter int not null,
  year int not null,
  weekday smallint not null,            -- ISO: 1 = poniedziałek … 7 = niedziela
  is_holiday boolean not null,
  is_working_day boolean not null       -- nie weekend i nie święto
);
comment on table analytics.dim_date is 'rls: public_read (słownik kalendarza, bez tenant_id); append_only: no; retention: indefinite';

insert into analytics.dim_date
select
  d::date,
  extract(week from d)::int,
  extract(isoyear from d)::int,
  extract(month from d)::int,
  extract(quarter from d)::int,
  extract(year from d)::int,
  extract(isodow from d)::smallint,
  analytics.is_pl_holiday(d::date),
  extract(isodow from d) < 6 and not analytics.is_pl_holiday(d::date)
from generate_series(date '2020-01-01', date '2040-12-31', interval '1 day') d;

create table analytics.dim_location (
  location_key uuid primary key,
  tenant_id uuid not null,
  number text not null,
  name text not null,
  color_key text not null,
  active boolean not null
);
comment on table analytics.dim_location is 'rls: tenant_all (dim_location); append_only: no; retention: rebuildable';

create table analytics.dim_chair (
  chair_key uuid primary key,
  tenant_id uuid not null,
  location_key uuid not null,
  name text not null,
  position int not null,
  active boolean not null
);
comment on table analytics.dim_chair is 'rls: tenant_all (dim_chair); append_only: no; retention: rebuildable';

create table analytics.dim_provider (
  provider_key uuid primary key,
  tenant_id uuid not null,
  display_name text not null,
  title text,
  role text not null
);
comment on table analytics.dim_provider is 'rls: tenant_all (dim_provider; dane pracownicze, bez kontaktu); append_only: no; retention: rebuildable';

create table analytics.dim_category (
  category_key text primary key,
  name text not null,
  position int not null
);
comment on table analytics.dim_category is 'rls: public_read (słownik Z1…Z+, bez tenant_id); append_only: no; retention: indefinite';

insert into analytics.dim_category (category_key, name, position) values
  ('Z1', 'Kategoria Z1', 1),
  ('Z2', 'Kategoria Z2', 2),
  ('Z3', 'Kategoria Z3', 3),
  ('Z4', 'Kategoria Z4', 4),
  ('Z5', 'Kategoria Z5', 5),
  ('Z+', 'Kategoria Z+', 6);

-- ---------------------------------------------------------------------------
-- Fakty
-- ---------------------------------------------------------------------------
create table analytics.fact_chair_capacity (
  tenant_id uuid not null,
  location_id uuid not null,
  chair_key uuid not null,
  date_key date not null,
  open_minutes int not null,
  blocked_minutes int not null,
  available_minutes int not null,
  refreshed_at timestamptz not null,
  primary key (chair_key, date_key)
);
comment on table analytics.fact_chair_capacity is 'rls: tenant_location; append_only: no; retention: rebuildable (13 mies. odświeżane, starsze zostają)';
create index fact_chair_capacity_tenant_loc_date_idx
  on analytics.fact_chair_capacity (tenant_id, location_id, date_key);

-- provider_key NOT NULL (wymóg PK). Wpis bez wykonawcy → wartownik
-- 00000000-0000-7000-8000-000000000000 (nie istnieje w dim_provider).
create table analytics.fact_chair_occupancy (
  tenant_id uuid not null,
  location_id uuid not null,
  chair_key uuid not null,
  date_key date not null,
  provider_key uuid not null,
  category_key text not null,
  occupied_minutes int not null,
  amount_grosze bigint not null default 0,
  entries int not null,
  source scheduling.occupancy_source not null,
  refreshed_at timestamptz not null,
  primary key (chair_key, date_key, provider_key, category_key, source)
);
comment on table analytics.fact_chair_occupancy is 'rls: tenant_location; append_only: no; retention: rebuildable; provider_key = 00000000-0000-7000-8000-000000000000 gdy wpis bez wykonawcy (PK wymaga NOT NULL)';
create index fact_chair_occupancy_tenant_loc_date_idx
  on analytics.fact_chair_occupancy (tenant_id, location_id, date_key);
create index fact_chair_occupancy_provider_date_idx
  on analytics.fact_chair_occupancy (provider_key, date_key);

create table analytics.fact_day_closures (
  tenant_id uuid not null,
  location_id uuid not null,
  date_key date not null,
  closed boolean not null,
  closed_at timestamptz,
  refreshed_at timestamptz not null,
  primary key (location_id, date_key)
);
comment on table analytics.fact_day_closures is 'rls: tenant_location; append_only: no; retention: rebuildable';
create index fact_day_closures_tenant_loc_date_idx
  on analytics.fact_day_closures (tenant_id, location_id, date_key);

create table analytics.refresh_log (
  id uuid primary key default extensions.uuid_generate_v7(),
  window_from timestamptz not null,
  window_to timestamptz not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  rows_written int,
  mode text not null check (mode in ('incremental', 'full'))
);
comment on table analytics.refresh_log is 'rls: worker_write (odczyt dla authenticated: metadane bez danych tenantów); append_only: no; retention: 13m';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on all tables in schema analytics to authenticated, crux_app;
grant select, insert, update, delete on all tables in schema analytics to crux_worker;
grant usage on schema scheduling to authenticated, crux_app, crux_worker;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table analytics.dim_date enable row level security;
alter table analytics.dim_category enable row level security;
alter table analytics.dim_location enable row level security;
alter table analytics.dim_chair enable row level security;
alter table analytics.dim_provider enable row level security;
alter table analytics.fact_chair_capacity enable row level security;
alter table analytics.fact_chair_occupancy enable row level security;
alter table analytics.fact_day_closures enable row level security;
alter table analytics.refresh_log enable row level security;

-- Słowniki globalne
create policy dim_date_read on analytics.dim_date
  for select to authenticated, crux_app using (true);
create policy dim_category_read on analytics.dim_category
  for select to authenticated, crux_app using (true);

-- Wymiary tenantowe
create policy dim_location_select on analytics.dim_location
  for select to authenticated, crux_app
  using (tenant_id = extensions.tenant_id());
create policy dim_chair_select on analytics.dim_chair
  for select to authenticated, crux_app
  using (tenant_id = extensions.tenant_id());
create policy dim_provider_select on analytics.dim_provider
  for select to authenticated, crux_app
  using (tenant_id = extensions.tenant_id());

-- Fakty: tenant_location + poziom uprawnień analytics.*
--  wykonawca (view_self) widzi tylko własne wiersze obłożenia; pojemność i zamknięcia: view_location+
create policy fact_occupancy_select on analytics.fact_chair_occupancy
  for select to authenticated, crux_app
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('analytics.view_network')
      or extensions.has_permission('analytics.view_location')
      or (extensions.has_permission('analytics.view_self') and provider_key = extensions.staff_id())
    )
  );

create policy fact_capacity_select on analytics.fact_chair_capacity
  for select to authenticated, crux_app
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('analytics.view_network')
      or extensions.has_permission('analytics.view_location')
    )
  );

create policy fact_closures_select on analytics.fact_day_closures
  for select to authenticated, crux_app
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('analytics.view_network')
      or extensions.has_permission('analytics.view_location')
    )
  );

create policy refresh_log_select on analytics.refresh_log
  for select to authenticated, crux_app using (true);

-- Worker: zapis tylko w operacji `analytics.refresh`
create policy dim_date_worker on analytics.dim_date
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy dim_category_worker on analytics.dim_category
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy dim_location_worker on analytics.dim_location
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy dim_chair_worker on analytics.dim_chair
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy dim_provider_worker on analytics.dim_provider
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy fact_capacity_worker on analytics.fact_chair_capacity
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy fact_occupancy_worker on analytics.fact_chair_occupancy
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy fact_closures_worker on analytics.fact_day_closures
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');
create policy refresh_log_worker on analytics.refresh_log
  for all to crux_worker
  using (extensions.worker_operation() = 'analytics.refresh')
  with check (extensions.worker_operation() = 'analytics.refresh');

-- Worker czyta źródła operacyjne wyłącznie w operacji `analytics.refresh`
create policy tenants_worker_analytics on org.tenants
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy locations_worker_analytics on org.locations
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy chairs_worker_analytics on org.chairs
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy opening_hours_worker_analytics on org.opening_hours
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy opening_exceptions_worker_analytics on org.opening_exceptions
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy staff_worker_analytics on identity.staff_members
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy memberships_worker_analytics on identity.memberships
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy time_blocks_worker_analytics on scheduling.time_blocks
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy chair_occupancy_worker_analytics on scheduling.chair_occupancy
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');
create policy day_closures_worker_analytics on scheduling.occupancy_day_closures
  for select to crux_worker using (extensions.worker_operation() = 'analytics.refresh');

-- ---------------------------------------------------------------------------
-- Widoki per rola (security_invoker: RLS faktów obowiązuje dodatkowo)
-- ---------------------------------------------------------------------------
create view analytics.v_self_occupancy with (security_invoker = true) as
  select * from analytics.fact_chair_occupancy
  where provider_key = extensions.staff_id();

create view analytics.v_location_occupancy with (security_invoker = true) as
  select * from analytics.fact_chair_occupancy
  where location_id = any (extensions.location_ids());
create view analytics.v_location_capacity with (security_invoker = true) as
  select * from analytics.fact_chair_capacity
  where location_id = any (extensions.location_ids());
create view analytics.v_location_day_closures with (security_invoker = true) as
  select * from analytics.fact_day_closures
  where location_id = any (extensions.location_ids());

create view analytics.v_network_occupancy with (security_invoker = true) as
  select * from analytics.fact_chair_occupancy
  where tenant_id = extensions.tenant_id()
    and extensions.has_permission('analytics.view_network');
create view analytics.v_network_capacity with (security_invoker = true) as
  select * from analytics.fact_chair_capacity
  where tenant_id = extensions.tenant_id()
    and extensions.has_permission('analytics.view_network');
create view analytics.v_network_day_closures with (security_invoker = true) as
  select * from analytics.fact_day_closures
  where tenant_id = extensions.tenant_id()
    and extensions.has_permission('analytics.view_network');

grant select on all tables in schema analytics to authenticated, crux_app;
