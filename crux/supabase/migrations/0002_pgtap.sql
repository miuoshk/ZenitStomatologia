-- K02 · pgTAP + test harness schema (fixture tables in tests.* only — not domain)

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
comment on schema tests is 'pgTAP helpers and fixture rows for RLS tests; not application domain';

grant usage on schema tests to authenticated, crux_app, crux_worker;
grant select, insert, update, delete on all tables in schema tests to authenticated, crux_app, crux_worker;
alter default privileges in schema tests
  grant select, insert, update, delete on tables to authenticated, crux_app, crux_worker;
grant execute on all functions in schema tests to authenticated, crux_app, crux_worker;
alter default privileges in schema tests grant execute on functions to authenticated, crux_app, crux_worker;

-- Fixture tables (harness only; real tenants/locations/staff arrive in K06)
create table if not exists tests.tenants (
  id uuid primary key default extensions.uuid_generate_v7(),
  name text not null
);

create table if not exists tests.locations (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references tests.tenants (id),
  number text not null,
  unique (tenant_id, number)
);

create table if not exists tests.staff (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references tests.tenants (id),
  role text not null,
  permissions jsonb not null default '[]'::jsonb
);

create table if not exists tests.memberships (
  staff_id uuid not null references tests.staff (id),
  location_id uuid not null references tests.locations (id),
  primary key (staff_id, location_id)
);

-- Stable handles used by tests.tenant_a() / tenant_b() / location()
create table if not exists tests.handles (
  key text primary key,
  id uuid not null
);

create or replace function tests.create_tenant(p_name text)
returns uuid
language plpgsql
security definer
set search_path = tests, extensions, public
as $$
declare
  v_id uuid;
begin
  insert into tests.tenants (name) values (p_name) returning id into v_id;
  if p_name = 'tenant_a' then
    insert into tests.handles (key, id) values ('tenant_a', v_id)
    on conflict (key) do update set id = excluded.id;
  elsif p_name = 'tenant_b' then
    insert into tests.handles (key, id) values ('tenant_b', v_id)
    on conflict (key) do update set id = excluded.id;
  end if;
  return v_id;
end;
$$;

create or replace function tests.create_location(p_tenant uuid, p_number text)
returns uuid
language plpgsql
security definer
set search_path = tests, extensions, public
as $$
declare
  v_id uuid;
begin
  insert into tests.locations (tenant_id, number)
  values (p_tenant, p_number)
  returning id into v_id;
  insert into tests.handles (key, id) values ('location:' || p_number, v_id)
  on conflict (key) do update set id = excluded.id;
  return v_id;
end;
$$;

create or replace function tests.create_staff(
  p_tenant uuid,
  p_role text,
  p_locations uuid[],
  p_permissions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = tests, extensions, public
as $$
declare
  v_id uuid;
  loc uuid;
begin
  insert into tests.staff (tenant_id, role, permissions)
  values (p_tenant, p_role, coalesce(p_permissions, '[]'::jsonb))
  returning id into v_id;

  if p_locations is not null then
    foreach loc in array p_locations loop
      insert into tests.memberships (staff_id, location_id) values (v_id, loc);
    end loop;
  end if;
  return v_id;
end;
$$;

-- Sets request.jwt.claims like withActor (transaction-local).
-- Caller must `set local role authenticated` in the test body (SET ROLE inside a function does not stick).
create or replace function tests.authenticate_as(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = tests, auth, public
as $$
declare
  v_tenant uuid;
  v_role text;
  v_permissions jsonb;
  v_locations uuid[];
  v_claims jsonb;
begin
  select tenant_id, role, permissions
    into v_tenant, v_role, v_permissions
  from tests.staff
  where id = p_staff_id;

  if v_tenant is null then
    raise exception 'tests.authenticate_as: unknown staff_id %', p_staff_id;
  end if;

  select coalesce(array_agg(location_id), '{}'::uuid[])
    into v_locations
  from tests.memberships
  where staff_id = p_staff_id;

  v_claims := jsonb_build_object(
    'staff_id', p_staff_id,
    'tenant_id', v_tenant,
    'location_ids', to_jsonb(v_locations),
    'role', v_role,
    'permissions', coalesce(v_permissions, '[]'::jsonb)
  );

  perform set_config('request.jwt.claims', v_claims::text, true);
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function tests.tenant_a()
returns uuid
language sql
stable
security definer
set search_path = tests
as $$
  select id from tests.handles where key = 'tenant_a'
$$;

create or replace function tests.tenant_b()
returns uuid
language sql
stable
security definer
set search_path = tests
as $$
  select id from tests.handles where key = 'tenant_b'
$$;

create or replace function tests.location(p_number text)
returns uuid
language sql
stable
security definer
set search_path = tests
as $$
  select id from tests.handles where key = 'location:' || p_number
$$;
