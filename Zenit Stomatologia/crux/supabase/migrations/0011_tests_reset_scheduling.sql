-- K11: harness reset obejmuje tabele scheduling (FK do org.* blokuje TRUNCATE bez nich)
create or replace function tests.reset_fixtures()
returns void
language plpgsql
security definer
set search_path = tests, platform, audit, org, identity, scheduling, public
as $$
begin
  truncate
    scheduling.chair_occupancy,
    scheduling.time_blocks,
    scheduling.occupancy_day_closures,
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
