-- K04 · security definer reset for Vitest harness (crux_app cannot TRUNCATE)

create or replace function tests.reset_fixtures()
returns void
language plpgsql
security definer
set search_path = tests, public
as $$
begin
  truncate tests.memberships, tests.staff, tests.locations, tests.tenants, tests.handles
    restart identity cascade;
end;
$$;

revoke all on function tests.reset_fixtures() from public;
grant execute on function tests.reset_fixtures() to authenticated, crux_app, crux_worker;
