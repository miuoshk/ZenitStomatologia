-- K06 · identity schema: staff, memberships, permissions, break-glass

create schema if not exists identity;
comment on schema identity is 'staff, memberships, permissions, break-glass';

grant usage on schema identity to authenticated, crux_app, crux_worker;

create type identity.staff_role as enum (
  'network_admin',
  'location_manager',
  'dentist',
  'hygienist',
  'assistant',
  'receptionist',
  'accountant',
  'auditor'
);

create table identity.staff_members (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  auth_user_id uuid unique,
  first_name text not null,
  last_name text not null,
  display_name text,
  title text,
  npwz text,
  email text not null,
  phone text,
  color_key text,
  active boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid,
  unique (tenant_id, npwz),
  unique (tenant_id, email)
);
comment on table identity.staff_members is 'rls: tenant_all; append_only: no; retention: indefinite';

create table identity.memberships (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  staff_id uuid not null references identity.staff_members (id),
  location_id uuid not null references org.locations (id),
  role identity.staff_role not null,
  starts_on date not null,
  ends_on date,
  unique (staff_id, location_id, role)
);
comment on table identity.memberships is 'rls: tenant_location; append_only: no; retention: indefinite';

create table identity.permissions (
  key text primary key,
  description text not null
);
comment on table identity.permissions is 'rls: ref_read; append_only: no; retention: indefinite';

create table identity.role_permissions (
  role identity.staff_role not null,
  permission text not null references identity.permissions (key),
  primary key (role, permission)
);
comment on table identity.role_permissions is 'rls: ref_read; append_only: no; retention: indefinite';

create table identity.provider_capabilities (
  tenant_id uuid not null references org.tenants (id),
  staff_id uuid not null references identity.staff_members (id),
  service_category text not null,
  primary key (staff_id, service_category)
);
comment on table identity.provider_capabilities is 'rls: tenant_all; append_only: no; retention: indefinite';

create table identity.break_glass_requests (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  staff_id uuid not null references identity.staff_members (id),
  patient_id uuid not null,
  reason text not null,
  granted_until timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table identity.break_glass_requests is 'rls: break_glass; append_only: yes; retention: 20y';

grant select on identity.permissions, identity.role_permissions to authenticated, crux_app, crux_worker;
grant select on identity.staff_members, identity.memberships, identity.provider_capabilities,
  identity.break_glass_requests to authenticated, crux_app, crux_worker;
grant insert, update on identity.staff_members, identity.memberships, identity.provider_capabilities
  to authenticated, crux_app;
grant insert on identity.break_glass_requests to authenticated, crux_app;
grant insert, update, delete on all tables in schema identity to crux_worker;

-- Allow authorize() to record forbidden attempts without new security definer
grant insert on audit.events to authenticated, crux_app;
create policy events_forbidden_insert on audit.events
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and actor_id = extensions.staff_id()
    and action = 'forbidden'
  );

alter table identity.staff_members enable row level security;
alter table identity.memberships enable row level security;
alter table identity.permissions enable row level security;
alter table identity.role_permissions enable row level security;
alter table identity.provider_capabilities enable row level security;
alter table identity.break_glass_requests enable row level security;

create policy permissions_read on identity.permissions
  for select to authenticated using (true);
create policy role_permissions_read on identity.role_permissions
  for select to authenticated using (true);

create policy staff_tenant_select on identity.staff_members
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy staff_self_or_manage_update on identity.staff_members
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (id = extensions.staff_id() or extensions.has_permission('staff.manage'))
  )
  with check (
    tenant_id = extensions.tenant_id()
    and (id = extensions.staff_id() or extensions.has_permission('staff.manage'))
  );
create policy staff_manage_insert on identity.staff_members
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('staff.manage')
  );

-- Memberships: own location memberships, or staff.manage / network.view
create policy memberships_select on identity.memberships
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      staff_id = extensions.staff_id()
      or location_id = any (extensions.location_ids())
      or extensions.has_permission('staff.manage')
      or extensions.has_permission('network.view')
    )
  );
create policy memberships_write on identity.memberships
  for all to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('staff.manage')
  )
  with check (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('staff.manage')
  );

create policy capabilities_select on identity.provider_capabilities
  for select to authenticated
  using (tenant_id = extensions.tenant_id());
create policy capabilities_write on identity.provider_capabilities
  for all to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('staff.manage')
  )
  with check (
    tenant_id = extensions.tenant_id()
    and extensions.has_permission('staff.manage')
  );

create policy break_glass_insert on identity.break_glass_requests
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and staff_id = extensions.staff_id()
    and extensions.role() in ('dentist', 'location_manager')
  );
create policy break_glass_select on identity.break_glass_requests
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      staff_id = extensions.staff_id()
      or extensions.has_permission('audit.read')
    )
  );

-- Extend harness reset
create or replace function tests.reset_fixtures()
returns void
language plpgsql
security definer
set search_path = tests, platform, audit, org, identity, public
as $$
begin
  truncate
    identity.break_glass_requests,
    identity.provider_capabilities,
    identity.memberships,
    identity.staff_members,
    org.opening_exceptions,
    org.opening_hours,
    org.chairs,
    org.locations,
    org.tenants,
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
