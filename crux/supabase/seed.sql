-- K12 · seed.sql zawiera wyłącznie słowniki. Uprawnienia ról (identity.role_permissions)
-- pochodzą z migracji 0007. Dane demo: `pnpm seed:demo` (packages/testing).
--
-- Audyt 1.0 · `tests.reset_fixtures()` żyje tylko tutaj. seed.sql uruchamia wyłącznie lokalny
-- `supabase start` / `supabase db reset` (Vitest, pgTAP, CI); `supabase db push` go nie wykonuje,
-- więc bazy hostowane (staging, produkcja) nie mają funkcji czyszczącej dane i audyt.
-- Utrzymuj listę tabel w zgodzie z migracjami (nowa tabela z FK → dopisz tutaj).

create or replace function tests.reset_fixtures()
returns void
language plpgsql
security definer
set search_path = tests, platform, audit, org, identity, scheduling, analytics, public
as $$
begin
  truncate
    analytics.fact_chair_capacity,
    analytics.fact_chair_occupancy,
    analytics.fact_day_closures,
    analytics.refresh_log,
    analytics.dim_location,
    analytics.dim_chair,
    analytics.dim_provider,
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

revoke all on function tests.reset_fixtures() from public;
grant execute on function tests.reset_fixtures() to authenticated, crux_app, crux_worker;

-- Audyt 1.0 · rola kopii nocnej (migracja 20261126000300) loguje się lokalnie znanym hasłem.
-- Na bazach hostowanych LOGIN i hasło ustawia operator (docs/ops/kopie-i-odtwarzanie.md).
alter role crux_backup login password 'crux_backup_local_only';
