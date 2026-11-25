-- K06 · org schema: tenants, locations, chairs, opening hours

create schema if not exists org;
comment on schema org is 'tenants, locations, chairs, opening hours';

grant usage on schema org to authenticated, crux_app, crux_worker;

create table org.tenants (
  id uuid primary key default extensions.uuid_generate_v7(),
  name text not null,
  legal_name text not null,
  nip text,
  regon text,
  rpwdl_book_number text,
  address jsonb,
  time_zone text not null default 'Europe/Warsaw',
  dek_key_id text not null,
  created_at timestamptz not null default now()
);
comment on table org.tenants is 'rls: own_tenant; append_only: no; retention: indefinite';

create table org.locations (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  number text not null check (number ~ '^\d{2}$'),
  name text not null,
  resort_code text,
  address jsonb not null,
  phone text,
  email text,
  geo point,
  color_key text not null check (color_key in ('loc1', 'loc2', 'loc3', 'loc4')),
  active boolean not null default true,
  opened_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid,
  unique (tenant_id, number)
);
comment on table org.locations is 'rls: tenant_all; append_only: no; retention: indefinite';

create table org.chairs (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  name text not null,
  position int not null,
  equipment text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid,
  unique (location_id, name)
);
comment on table org.chairs is 'rls: tenant_all; append_only: no; retention: indefinite';

create table org.opening_hours (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  weekday smallint not null check (weekday between 1 and 7),
  opens time not null,
  closes time not null,
  valid_from date not null,
  valid_to date,
  check (opens < closes)
);
comment on table org.opening_hours is 'rls: tenant_all; append_only: no; retention: indefinite';

create table org.opening_exceptions (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  day date not null,
  opens time,
  closes time,
  closed boolean not null default false,
  reason text,
  unique (location_id, day)
);
comment on table org.opening_exceptions is 'rls: tenant_all; append_only: no; retention: indefinite';

grant select on org.tenants, org.locations, org.chairs, org.opening_hours, org.opening_exceptions
  to authenticated, crux_app, crux_worker;
grant insert, update on org.tenants, org.locations, org.chairs, org.opening_hours, org.opening_exceptions
  to authenticated, crux_app;
grant insert, update, delete on all tables in schema org to crux_worker;

alter table org.tenants enable row level security;
alter table org.locations enable row level security;
alter table org.chairs enable row level security;
alter table org.opening_hours enable row level security;
alter table org.opening_exceptions enable row level security;

create policy tenants_select_own on org.tenants
  for select to authenticated
  using (id = extensions.tenant_id());
create policy tenants_insert on org.tenants
  for insert to authenticated
  with check (true); -- bootstrap; later restricted via app authorize
create policy tenants_update on org.tenants
  for update to authenticated
  using (id = extensions.tenant_id() and extensions.has_permission('org.manage'))
  with check (id = extensions.tenant_id() and extensions.has_permission('org.manage'));

create policy locations_tenant_select on org.locations
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy locations_tenant_write on org.locations
  for all to authenticated
  using (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'))
  with check (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'));

create policy chairs_tenant_select on org.chairs
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy chairs_tenant_write on org.chairs
  for all to authenticated
  using (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'))
  with check (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'));

create policy opening_hours_tenant_select on org.opening_hours
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy opening_hours_tenant_write on org.opening_hours
  for all to authenticated
  using (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'))
  with check (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'));

create policy opening_exceptions_tenant_select on org.opening_exceptions
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy opening_exceptions_tenant_write on org.opening_exceptions
  for all to authenticated
  using (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'))
  with check (tenant_id = extensions.tenant_id() and extensions.has_permission('org.manage'));
