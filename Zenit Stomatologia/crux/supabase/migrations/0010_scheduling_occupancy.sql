-- K11 · scheduling: obłożenie godzinowe foteli (F0-010)

create schema if not exists scheduling;
comment on schema scheduling is 'obłożenie foteli (1.0), wizyty (1.1+)';

grant usage on schema scheduling to authenticated, crux_app, crux_worker;

create type scheduling.occupancy_source as enum ('manual', 'appointment', 'import');

create table scheduling.time_blocks (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  staff_id uuid references identity.staff_members (id),
  chair_id uuid references org.chairs (id),
  period tstzrange not null,
  kind text not null,
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  created_by uuid,
  ended_at timestamptz,
  ended_by uuid,
  check (staff_id is not null or chair_id is not null),
  check (lower(period) < upper(period))
);
comment on table scheduling.time_blocks is 'rls: tenant_location; append_only: no; retention: 5y';
create index time_blocks_tenant_loc_period_idx
  on scheduling.time_blocks (tenant_id, location_id, lower(period));

create table scheduling.chair_occupancy (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  chair_id uuid not null references org.chairs (id),
  provider_id uuid references identity.staff_members (id),
  period tstzrange not null,
  category text not null,
  amount_grosze bigint check (amount_grosze is null or amount_grosze >= 0),
  source scheduling.occupancy_source not null default 'manual',
  appointment_id uuid,
  override_reason text,
  note text check (char_length(note) <= 80),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  check (lower(period) < upper(period)),
  check ((voided_at is null) = (void_reason is null)),
  exclude using gist (
    chair_id with =,
    period with &&
  ) where (voided_at is null)
);
comment on table scheduling.chair_occupancy is 'rls: tenant_location; append_only: no; retention: 5y';
create index chair_occupancy_tenant_loc_period_idx
  on scheduling.chair_occupancy (tenant_id, location_id, lower(period));
create index chair_occupancy_tenant_provider_period_idx
  on scheduling.chair_occupancy (tenant_id, provider_id, lower(period));
create index chair_occupancy_active_chair_period_idx
  on scheduling.chair_occupancy (tenant_id, chair_id, lower(period))
  where voided_at is null;

create table scheduling.occupancy_day_closures (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references org.tenants (id),
  location_id uuid not null references org.locations (id),
  day date not null,
  closed_at timestamptz not null default now(),
  closed_by uuid not null,
  summary jsonb not null,
  reopened_at timestamptz,
  reopened_by uuid,
  reopen_reason text,
  unique (location_id, day)
);
comment on table scheduling.occupancy_day_closures is 'rls: tenant_location; append_only: no; retention: 5y';

-- Grants
grant select, insert, update on scheduling.time_blocks, scheduling.chair_occupancy, scheduling.occupancy_day_closures
  to authenticated, crux_app;
grant select, insert, update, delete on all tables in schema scheduling to crux_worker;
-- no delete for authenticated (AC: delete nikomu)

alter table scheduling.time_blocks enable row level security;
alter table scheduling.chair_occupancy enable row level security;
alter table scheduling.occupancy_day_closures enable row level security;

-- tenant_location select
create policy time_blocks_select on scheduling.time_blocks
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );

create policy time_blocks_insert on scheduling.time_blocks
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or extensions.has_permission('occupancy.write_closed')
    )
  );

create policy time_blocks_update on scheduling.time_blocks
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or extensions.has_permission('occupancy.write_closed')
    )
  )
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );

-- chair_occupancy: select tenant_location
create policy chair_occupancy_select on scheduling.chair_occupancy
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );

-- insert: occupancy.write (location) OR write_own (provider = self)
create policy chair_occupancy_insert on scheduling.chair_occupancy
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or (
        extensions.has_permission('occupancy.write_own')
        and provider_id = extensions.staff_id()
      )
      or extensions.has_permission('occupancy.write_closed')
    )
  );

create policy chair_occupancy_update on scheduling.chair_occupancy
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or (
        extensions.has_permission('occupancy.write_own')
        and provider_id = extensions.staff_id()
      )
      or extensions.has_permission('occupancy.void')
      or extensions.has_permission('occupancy.write_closed')
    )
  )
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );

-- closures
create policy day_closures_select on scheduling.occupancy_day_closures
  for select to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );

create policy day_closures_insert on scheduling.occupancy_day_closures
  for insert to authenticated
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and extensions.has_permission('occupancy.close_day')
  );

create policy day_closures_update on scheduling.occupancy_day_closures
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and extensions.has_permission('occupancy.write_closed')
  )
  with check (
    tenant_id = extensions.tenant_id()
  );

-- Audyt
create trigger chair_occupancy_audit
  after insert or update or delete on scheduling.chair_occupancy
  for each row execute function audit.track();

create trigger time_blocks_audit
  after insert or update or delete on scheduling.time_blocks
  for each row execute function audit.track();

create trigger occupancy_day_closures_audit
  after insert or update or delete on scheduling.occupancy_day_closures
  for each row execute function audit.track();
