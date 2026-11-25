-- K02 · foundation (no domain tables)
-- Extensions, schemas, uuidv7, auth claims helpers, app/worker roles, privileges.

create schema if not exists extensions;
create schema if not exists ref;
create schema if not exists audit;
create schema if not exists platform;
create schema if not exists analytics;
create schema if not exists pgboss;

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

comment on schema ref is 'reference dictionaries; read-only for authenticated; no tenant_id';
comment on schema audit is 'append-only audit and access log; authenticated has no direct DML (K05 trigger)';
comment on schema platform is 'outbox, command_log, feature flags, settings';
comment on schema analytics is 'star schema facts/dims; dashboards only';
comment on schema pgboss is 'pg-boss job queue (worker)';

-- Roles first (LOGIN, no bypassrls). Local passwords only — override in hosted.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crux_app') then
    create role crux_app login password 'crux_app_local_only'
      nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'crux_worker') then
    create role crux_worker login password 'crux_worker_local_only'
      nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end;
$$;

grant authenticated to crux_app;

-- UUIDv7 (RFC 9562) until Postgres 18 native uuidv7()
create or replace function extensions.uuid_generate_v7()
returns uuid
language plpgsql
volatile
parallel safe
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  -- version 7 (0b0111 << 4)
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  -- RFC 4122 variant (0b10 << 6)
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  return encode(uuid_bytes, 'hex')::uuid;
end;
$$;

revoke all on function extensions.uuid_generate_v7() from public;
grant execute on function extensions.uuid_generate_v7() to authenticated, crux_app, crux_worker;


-- Claims helpers: missing/invalid claims → null / '{}' / false (never throw)
-- Claims helpers in extensions (Supabase locks CREATE on schema auth for migrator role postgres).
-- Call sites: extensions.tenant_id() etc. Stock auth.role()/auth.uid() untouched.
create or replace function extensions.tenant_id()
returns uuid
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
  return nullif(claims ->> 'tenant_id', '')::uuid;
end;
$$;

create or replace function extensions.staff_id()
returns uuid
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
  return nullif(claims ->> 'staff_id', '')::uuid;
end;
$$;

create or replace function extensions.location_ids()
returns uuid[]
language plpgsql
stable
parallel safe
as $$
declare
  raw text := current_setting('request.jwt.claims', true);
  claims jsonb;
begin
  if raw is null or raw = '' then
    return '{}'::uuid[];
  end if;
  begin
    claims := raw::jsonb;
  exception when others then
    return '{}'::uuid[];
  end;
  return coalesce(
    (
      select array_agg(value::uuid)
      from jsonb_array_elements_text(coalesce(claims -> 'location_ids', '[]'::jsonb)) as t(value)
    ),
    '{}'::uuid[]
  );
end;
$$;

create or replace function extensions.role()
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
  return nullif(claims ->> 'role', '');
end;
$$;

create or replace function extensions.has_permission(p text)
returns boolean
language plpgsql
stable
parallel safe
as $$
declare
  raw text := current_setting('request.jwt.claims', true);
  claims jsonb;
begin
  if p is null or raw is null or raw = '' then
    return false;
  end if;
  begin
    claims := raw::jsonb;
  exception when others then
    return false;
  end;
  -- permissions is a JSON array of strings, not an object
  return coalesce(claims -> 'permissions' @> to_jsonb(p), false);
end;
$$;

revoke all on function extensions.tenant_id() from public;
revoke all on function extensions.staff_id() from public;
revoke all on function extensions.location_ids() from public;
revoke all on function extensions.role() from public;
revoke all on function extensions.has_permission(text) from public;
grant execute on function extensions.tenant_id() to authenticated, crux_app, crux_worker;
grant execute on function extensions.staff_id() to authenticated, crux_app, crux_worker;
grant execute on function extensions.location_ids() to authenticated, crux_app, crux_worker;
grant execute on function extensions.role() to authenticated, crux_app, crux_worker;
grant execute on function extensions.has_permission(text) to authenticated, crux_app, crux_worker;

grant usage on schema public, ref, platform, analytics, extensions to authenticated;
grant usage on schema public, ref, platform, analytics, extensions to crux_app;
grant usage on schema public, ref, platform, analytics, extensions, pgboss, audit to crux_worker;

-- authenticated: select/insert/update on future public tables; no delete
alter default privileges for role postgres in schema public
  grant select, insert, update on tables to authenticated;
alter default privileges for role postgres in schema public
  revoke delete on tables from authenticated;

alter default privileges for role postgres in schema platform
  grant select, insert, update on tables to authenticated;
alter default privileges for role postgres in schema platform
  revoke delete on tables from authenticated;

alter default privileges for role postgres in schema analytics
  grant select on tables to authenticated;

alter default privileges for role postgres in schema ref
  grant select on tables to authenticated;

-- audit: no privileges for authenticated (insert only via security definer trigger in K05)
revoke all on schema audit from public;
revoke all on schema audit from authenticated;
grant usage on schema audit to crux_worker;


