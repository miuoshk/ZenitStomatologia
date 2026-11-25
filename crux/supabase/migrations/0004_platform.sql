-- K05 · platform + audit tables, RLS, audit.track / audit.log_access

-- Harden uuidv7 for callers with empty search_path (audit.track)
create or replace function extensions.uuid_generate_v7()
returns uuid
language plpgsql
volatile
parallel safe
set search_path = extensions, pg_temp
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  return encode(uuid_bytes, 'hex')::uuid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table platform.outbox (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  topic text not null,
  payload jsonb not null,
  dedupe_key text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'dead')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);
create index outbox_status_next_idx on platform.outbox (status, next_attempt_at);
comment on table platform.outbox is 'rls: tenant_all; append_only: no; retention: 90d';

create table platform.command_log (
  command_id uuid primary key,
  tenant_id uuid not null,
  actor_id uuid not null,
  name text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
comment on table platform.command_log is 'rls: tenant_all; append_only: yes; retention: 2y';

create table platform.feature_flags (
  key text not null,
  tenant_id uuid,
  location_id uuid,
  enabled boolean not null default false,
  payload jsonb,
  updated_at timestamptz,
  updated_by uuid,
  scope_tenant_id uuid generated always as (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  scope_location_id uuid generated always as (
    coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  primary key (key, scope_tenant_id, scope_location_id)
);
comment on table platform.feature_flags is 'rls: tenant_all; append_only: no; retention: indefinite';

create table platform.settings (
  tenant_id uuid not null,
  location_id uuid,
  key text not null,
  value jsonb not null,
  updated_at timestamptz,
  updated_by uuid,
  scope_location_id uuid generated always as (
    coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  primary key (tenant_id, scope_location_id, key)
);
comment on table platform.settings is 'rls: tenant_all; append_only: no; retention: indefinite';

create table audit.events (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  actor_id uuid,
  actor_role text,
  table_name text not null,
  row_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  request_id text,
  occurred_at timestamptz not null default now()
);
create index events_tenant_table_row_idx on audit.events (tenant_id, table_name, row_id);
comment on table audit.events is 'rls: audit.read; append_only: yes; retention: 20y';

create table audit.access_log (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  actor_id uuid not null,
  location_id uuid,
  patient_id uuid not null,
  resource text not null,
  resource_id uuid,
  action text not null,
  justification text,
  ip_hash bytea,
  user_agent_hash bytea,
  occurred_at timestamptz not null default now()
);
create index access_log_patient_idx on audit.access_log (tenant_id, patient_id, occurred_at);
create index access_log_actor_idx on audit.access_log (tenant_id, actor_id, occurred_at);
comment on table audit.access_log is 'rls: audit.read; append_only: yes; retention: 20y';

create table audit.integrity_checks (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  patient_id uuid,
  checked_at timestamptz not null,
  ok boolean not null,
  broken_at_version_id uuid,
  details text
);
comment on table audit.integrity_checks is 'rls: audit.read; append_only: yes; retention: 20y';

-- ---------------------------------------------------------------------------
-- Privileges (audit usable for select + security definer writes)
-- ---------------------------------------------------------------------------

grant usage on schema audit to authenticated, crux_app, crux_worker;

grant select, insert on platform.outbox to authenticated, crux_app;
grant select, update on platform.outbox to crux_worker;
grant select, insert on platform.command_log to authenticated, crux_app;
grant select on platform.feature_flags to authenticated, crux_app;
grant insert, update on platform.feature_flags to authenticated, crux_app;
grant select on platform.settings to authenticated, crux_app;
grant insert, update on platform.settings to authenticated, crux_app;

grant select on audit.events, audit.access_log, audit.integrity_checks to authenticated, crux_app, crux_worker;
grant insert on audit.events, audit.access_log, audit.integrity_checks to crux_worker;

revoke update, delete on audit.events from authenticated, crux_app, public;
revoke update, delete on audit.access_log from authenticated, crux_app, public;
revoke update, delete on audit.integrity_checks from authenticated, crux_app, public;
revoke insert on audit.events from authenticated, crux_app;
revoke insert on audit.access_log from authenticated, crux_app;
revoke insert on audit.integrity_checks from authenticated, crux_app;

revoke update, delete on platform.command_log from authenticated, crux_app;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table platform.outbox enable row level security;
alter table platform.command_log enable row level security;
alter table platform.feature_flags enable row level security;
alter table platform.settings enable row level security;
alter table audit.events enable row level security;
alter table audit.access_log enable row level security;
alter table audit.integrity_checks enable row level security;

create policy outbox_tenant_select on platform.outbox
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy outbox_tenant_insert on platform.outbox
  for insert to authenticated
  with check (tenant_id = extensions.tenant_id());

create policy command_log_tenant_select on platform.command_log
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy command_log_tenant_insert on platform.command_log
  for insert to authenticated
  with check (tenant_id = extensions.tenant_id());

create policy feature_flags_tenant_select on platform.feature_flags
  for select to authenticated
  using (tenant_id is null or tenant_id = extensions.tenant_id());
create policy feature_flags_tenant_write on platform.feature_flags
  for all to authenticated
  using (
    (tenant_id is null or tenant_id = extensions.tenant_id())
    and extensions.has_permission('settings.manage')
  )
  with check (
    (tenant_id is null or tenant_id = extensions.tenant_id())
    and extensions.has_permission('settings.manage')
  );

create policy settings_tenant_select on platform.settings
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy settings_tenant_write on platform.settings
  for all to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('settings.manage')
  )
  with check (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('settings.manage')
  );

create policy events_audit_read on audit.events
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('audit.read')
  );

create policy access_log_audit_read on audit.access_log
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('audit.read')
  );

create policy integrity_audit_read on audit.integrity_checks
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('audit.read')
  );

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function platform.set_reason(p_reason text)
returns void
language sql
volatile
as $$
  select set_config('crux.reason', coalesce(p_reason, ''), true);
$$;

revoke all on function platform.set_reason(text) from public;
grant execute on function platform.set_reason(text) to authenticated, crux_app, crux_worker;

create or replace function audit.strip_sensitive(p jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select coalesce(
    (
      select jsonb_object_agg(key, value)
      from jsonb_each(p) as t(key, value)
      where key not in ('pesel_enc', 'pesel_hmac', 'id_document_enc')
        and key !~ '_enc$'
    ),
    '{}'::jsonb
  );
$$;

create or replace function audit.track()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_row uuid;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_reason text;
begin
  if tg_op = 'DELETE' then
    v_action := 'delete';
    v_before := audit.strip_sensitive(to_jsonb(old));
    v_after := null;
    v_tenant := (to_jsonb(old) ->> 'tenant_id')::uuid;
    v_row := (to_jsonb(old) ->> 'id')::uuid;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_before := audit.strip_sensitive(to_jsonb(old));
    v_after := audit.strip_sensitive(to_jsonb(new));
    v_tenant := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_row := (to_jsonb(new) ->> 'id')::uuid;
  else
    v_action := 'insert';
    v_before := null;
    v_after := audit.strip_sensitive(to_jsonb(new));
    v_tenant := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_row := (to_jsonb(new) ->> 'id')::uuid;
  end if;

  if v_tenant is null or v_row is null then
    raise exception 'audit.track: row must have tenant_id and id';
  end if;

  v_reason := nullif(current_setting('crux.reason', true), '');

  insert into audit.events (
    tenant_id, actor_id, actor_role, table_name, row_id, action,
    before, after, reason, request_id
  ) values (
    v_tenant,
    extensions.staff_id(),
    extensions.role(),
    tg_table_schema || '.' || tg_table_name,
    v_row,
    v_action,
    v_before,
    v_after,
    v_reason,
    nullif(current_setting('crux.request_id', true), '')
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function audit.track() from public;

create or replace function audit.log_access(
  p_patient_id uuid,
  p_resource text,
  p_resource_id uuid,
  p_action text,
  p_justification text,
  p_ip_hash bytea,
  p_user_agent_hash bytea,
  p_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := extensions.tenant_id();
  v_actor uuid := extensions.staff_id();
  v_id uuid;
begin
  if v_tenant is null or v_actor is null then
    raise exception 'audit.log_access: missing claims' using errcode = '42501';
  end if;
  if p_patient_id is null or p_resource is null or p_action is null then
    raise exception 'audit.log_access: patient_id, resource, action required';
  end if;

  insert into audit.access_log (
    tenant_id, actor_id, location_id, patient_id, resource, resource_id,
    action, justification, ip_hash, user_agent_hash
  ) values (
    v_tenant, v_actor, coalesce(p_location_id, null), p_patient_id, p_resource, p_resource_id,
    p_action, p_justification, p_ip_hash, p_user_agent_hash
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function audit.log_access(uuid, text, uuid, text, text, bytea, bytea, uuid) from public;
grant execute on function audit.log_access(uuid, text, uuid, text, text, bytea, bytea, uuid)
  to authenticated, crux_app, crux_worker;

-- Probe table for pgTAP (sensitive columns stripped by audit.track)
create table tests.audit_probe (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  label text,
  pesel_enc text,
  id_document_enc text,
  note_enc text,
  pesel_hmac bytea
);

grant select, insert, update, delete on tests.audit_probe to authenticated, crux_app, crux_worker;

create trigger audit_probe_track
  after insert or update or delete on tests.audit_probe
  for each row execute function audit.track();

-- Extend harness reset (K04) for platform/audit tables
create or replace function tests.reset_fixtures()
returns void
language plpgsql
security definer
set search_path = tests, platform, audit, public
as $$
begin
  truncate
    tests.memberships,
    tests.staff,
    tests.locations,
    tests.tenants,
    tests.handles,
    tests.audit_probe,
    platform.outbox,
    platform.command_log,
    platform.feature_flags,
    platform.settings,
    audit.events,
    audit.access_log,
    audit.integrity_checks
    restart identity cascade;
end;
$$;
