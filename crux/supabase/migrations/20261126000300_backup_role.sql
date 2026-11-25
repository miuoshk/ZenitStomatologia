-- Audyt 1.0 (2026-11-25) · rola `crux_backup` dla kopii nocnej (ADR-034)
--
-- `pg_dump` jako `crux_worker` nie działał: brak SELECT na części tabel i RLS bez claims
-- („query would be affected by row-level security policy”). Kopia musi czytać całość,
-- więc dostaje osobną rolę: tylko odczyt, BYPASSRLS, bez dziedziczenia, bez zapisu.
--
-- Rola powstaje jako NOLOGIN. Logowanie i hasło ustawia operator poza repo:
--   alter role crux_backup login password '<z menedżera sekretów>';
-- (lokalnie robi to supabase/seed.sql). Worker używa jej tylko do pg_dump
-- przez `DATABASE_URL_BACKUP`; zapis zdarzenia `backup.completed` idzie nadal jako crux_worker.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crux_backup') then
    create role crux_backup nologin noinherit bypassrls
      nosuperuser nocreatedb nocreaterole noreplication;
  end if;
end;
$$;

grant usage on schema public, audit, platform, ref, analytics, org, identity, scheduling
  to crux_backup;

grant select on all tables in schema public, audit, platform, ref, analytics, org, identity, scheduling
  to crux_backup;
grant select on all sequences in schema public, audit, platform, ref, analytics, org, identity, scheduling
  to crux_backup;

alter default privileges in schema public, audit, platform, ref, analytics, org, identity, scheduling
  grant select on tables to crux_backup;
alter default privileges in schema public, audit, platform, ref, analytics, org, identity, scheduling
  grant select on sequences to crux_backup;

comment on role crux_backup is
  'pg_dump kopii nocnej: tylko SELECT, BYPASSRLS; LOGIN i hasło ustawia operator (docs/ops/kopie-i-odtwarzanie.md)';
