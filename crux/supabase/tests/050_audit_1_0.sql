-- Audyt 1.0 (2026-11-25): regresje RLS obłożenia, strażnik zamkniętego dnia,
-- brak funkcji czyszczącej w migracjach, rola kopii nocnej.
begin;
select plan(16);

select tests.clear_authentication();

insert into org.tenants (id, name, legal_name, dek_key_id) values
  ('a1000000-0000-7000-8000-000000000001'::uuid, 'aud_a', 'Aud A', 'local-v1');
insert into org.locations (id, tenant_id, number, name, address, color_key) values
  ('a1000000-0000-7000-8000-0000000000d1'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, '01', 'L1', '{}'::jsonb, 'loc1'),
  ('a1000000-0000-7000-8000-0000000000d2'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, '02', 'L2', '{}'::jsonb, 'loc2');
insert into org.chairs (id, tenant_id, location_id, name, position) values
  ('a1000000-0000-7000-8000-0000000000c1'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid, 'F1', 1);
insert into identity.staff_members (id, tenant_id, first_name, last_name, email) values
  ('a1000000-0000-7000-8000-0000000000e1'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'Rec', '01', 'rec@aud.test'),
  ('a1000000-0000-7000-8000-0000000000e2'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'Den', 'A', 'dena@aud.test'),
  ('a1000000-0000-7000-8000-0000000000e3'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'Den', 'B', 'denb@aud.test'),
  ('a1000000-0000-7000-8000-0000000000e4'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'Man', '01', 'man@aud.test');

-- Wpisy (jako postgres): lekarz B 10:00 w dniu otwartym 21.11, lekarz A 11:00 tamże,
-- lekarz B 10:00 w dniu zamkniętym 20.11.
insert into scheduling.chair_occupancy (id, tenant_id, location_id, chair_id, provider_id, period, category, amount_grosze) values
  ('a1000000-0000-7000-8000-0000000000b1'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid,
   'a1000000-0000-7000-8000-0000000000c1'::uuid, 'a1000000-0000-7000-8000-0000000000e3'::uuid,
   tstzrange('2026-11-21 10:00+01', '2026-11-21 11:00+01', '[)'), 'Z3', 45000),
  ('a1000000-0000-7000-8000-0000000000a1'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid,
   'a1000000-0000-7000-8000-0000000000c1'::uuid, 'a1000000-0000-7000-8000-0000000000e2'::uuid,
   tstzrange('2026-11-21 11:00+01', '2026-11-21 12:00+01', '[)'), 'Z1', 20000),
  ('a1000000-0000-7000-8000-0000000000b2'::uuid, 'a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid,
   'a1000000-0000-7000-8000-0000000000c1'::uuid, 'a1000000-0000-7000-8000-0000000000e3'::uuid,
   tstzrange('2026-11-20 10:00+01', '2026-11-20 11:00+01', '[)'), 'Z3', 45000);
insert into scheduling.occupancy_day_closures (tenant_id, location_id, day, closed_by, summary) values
  ('a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid, '2026-11-20',
   'a1000000-0000-7000-8000-0000000000e1'::uuid, '{}'::jsonb);

create temp table claims (who text primary key, c text);
grant select on claims to authenticated;
insert into claims values
  ('dentist_a', json_build_object(
     'staff_id', 'a1000000-0000-7000-8000-0000000000e2', 'tenant_id', 'a1000000-0000-7000-8000-000000000001',
     'location_ids', json_build_array('a1000000-0000-7000-8000-0000000000d1'), 'role', 'dentist',
     'permissions', json_build_array('occupancy.read', 'occupancy.write_own', 'occupancy.void', 'analytics.view_self'))::text),
  ('reception', json_build_object(
     'staff_id', 'a1000000-0000-7000-8000-0000000000e1', 'tenant_id', 'a1000000-0000-7000-8000-000000000001',
     'location_ids', json_build_array('a1000000-0000-7000-8000-0000000000d1'), 'role', 'receptionist',
     'permissions', json_build_array('occupancy.read', 'occupancy.write', 'occupancy.void', 'occupancy.close_day'))::text),
  ('manager', json_build_object(
     'staff_id', 'a1000000-0000-7000-8000-0000000000e4', 'tenant_id', 'a1000000-0000-7000-8000-000000000001',
     'location_ids', json_build_array('a1000000-0000-7000-8000-0000000000d1'), 'role', 'location_manager',
     'permissions', json_build_array('occupancy.read', 'occupancy.write', 'occupancy.void', 'occupancy.close_day',
       'occupancy.write_closed', 'occupancy.override_hours'))::text);

-- ===== Lekarz A (write_own + void, jak w seedzie ról 0007)
set local role authenticated;
select set_config('request.jwt.claims', (select c from claims where who = 'dentist_a'), true);

update scheduling.chair_occupancy set amount_grosze = 1
  where id = 'a1000000-0000-7000-8000-0000000000b1'::uuid;
reset role;
select is(
  (select amount_grosze from scheduling.chair_occupancy where id = 'a1000000-0000-7000-8000-0000000000b1'::uuid),
  45000::bigint,
  '[audyt-1.0] lekarz nie zmienia kwoty cudzego wpisu (void nie daje UPDATE cudzych)'
);

set local role authenticated;
select set_config('request.jwt.claims', (select c from claims where who = 'dentist_a'), true);
select throws_ok(
  $$ update scheduling.chair_occupancy
       set provider_id = 'a1000000-0000-7000-8000-0000000000e3'::uuid
     where id = 'a1000000-0000-7000-8000-0000000000a1'::uuid $$,
  '42501', null,
  '[audyt-1.0] lekarz nie przepisuje własnego wpisu na innego wykonawcę'
);
select lives_ok(
  $$ update scheduling.chair_occupancy set amount_grosze = 25000
     where id = 'a1000000-0000-7000-8000-0000000000a1'::uuid $$,
  '[audyt-1.0] lekarz poprawia kwotę własnego wpisu w dniu otwartym'
);
select lives_ok(
  $$ update scheduling.chair_occupancy set voided_at = now(), void_reason = 'pomyłka'
     where id = 'a1000000-0000-7000-8000-0000000000a1'::uuid $$,
  '[audyt-1.0] lekarz unieważnia własny wpis'
);
select throws_ok(
  $$ insert into scheduling.chair_occupancy (tenant_id, location_id, chair_id, provider_id, period, category, amount_grosze)
     values ('a1000000-0000-7000-8000-000000000001'::uuid, 'a1000000-0000-7000-8000-0000000000d1'::uuid,
             'a1000000-0000-7000-8000-0000000000c1'::uuid, 'a1000000-0000-7000-8000-0000000000e2'::uuid,
             tstzrange('2026-11-20 12:00+01', '2026-11-20 13:00+01', '[)'), 'Z1', 999900) $$,
  '42501', 'day_closed',
  '[audyt-1.0] lekarz nie dopisuje własnego wpisu do zamkniętego dnia'
);

-- ===== Recepcja (write + void, bez write_closed)
select set_config('request.jwt.claims', (select c from claims where who = 'reception'), true);
select throws_ok(
  $$ update scheduling.chair_occupancy set amount_grosze = 1
     where id = 'a1000000-0000-7000-8000-0000000000b2'::uuid $$,
  '42501', 'day_closed',
  '[audyt-1.0] recepcja nie zmienia wpisu w zamkniętym dniu'
);
select throws_ok(
  $$ update scheduling.chair_occupancy
       set period = tstzrange('2026-11-21 15:00+01', '2026-11-21 16:00+01', '[)')
     where id = 'a1000000-0000-7000-8000-0000000000b2'::uuid $$,
  '42501', 'day_closed',
  '[audyt-1.0] recepcja nie wyprowadza wpisu z zamkniętego dnia'
);
select throws_ok(
  $$ update scheduling.chair_occupancy
       set period = tstzrange('2026-11-20 16:00+01', '2026-11-20 17:00+01', '[)')
     where id = 'a1000000-0000-7000-8000-0000000000b1'::uuid $$,
  '42501', 'day_closed',
  '[audyt-1.0] recepcja nie wprowadza wpisu do zamkniętego dnia'
);
select lives_ok(
  $$ update scheduling.chair_occupancy set amount_grosze = 46000
     where id = 'a1000000-0000-7000-8000-0000000000b1'::uuid $$,
  '[audyt-1.0] recepcja poprawia cudzy wpis w dniu otwartym'
);
update scheduling.occupancy_day_closures set location_id = 'a1000000-0000-7000-8000-0000000000d2'::uuid;
reset role;
select is(
  (select count(*)::int from scheduling.occupancy_day_closures
    where location_id = 'a1000000-0000-7000-8000-0000000000d2'::uuid),
  0,
  '[audyt-1.0] recepcja nie przenosi zamknięcia dnia'
);

-- ===== Kierownik (write_closed)
set local role authenticated;
select set_config('request.jwt.claims', (select c from claims where who = 'manager'), true);
select lives_ok(
  $$ update scheduling.chair_occupancy set amount_grosze = 47000
     where id = 'a1000000-0000-7000-8000-0000000000b2'::uuid $$,
  '[audyt-1.0] kierownik z write_closed edytuje zamknięty dzień'
);
select throws_ok(
  $$ update scheduling.occupancy_day_closures
       set location_id = 'a1000000-0000-7000-8000-0000000000d2'::uuid $$,
  '42501', null,
  '[audyt-1.0] zamknięcie dnia nie przechodzi do gabinetu spoza zakresu aktora'
);
reset role;

-- ===== Migracje bez funkcji czyszczącej; rola kopii
select is(
  (select count(*)::int from supabase_migrations.schema_migrations m
    where m.statements::text ilike '%create or replace function tests.reset_fixtures%'
      and m.version >= '20261126000200'),
  0,
  '[audyt-1.0] żadna migracja po 20261126000200 nie tworzy tests.reset_fixtures'
);
select ok(
  (select rolbypassrls and not rolsuper and not rolcreaterole from pg_roles where rolname = 'crux_backup'),
  '[audyt-1.0] crux_backup: BYPASSRLS, bez superusera i CREATEROLE'
);
select ok(
  not has_table_privilege('crux_backup', 'scheduling.chair_occupancy', 'insert, update, delete'),
  '[audyt-1.0] crux_backup nie zapisuje'
);
select ok(
  has_table_privilege('crux_backup', 'scheduling.chair_occupancy', 'select')
  and has_table_privilege('crux_backup', 'identity.staff_members', 'select')
  and has_table_privilege('crux_backup', 'audit.events', 'select'),
  '[audyt-1.0] crux_backup czyta dane operacyjne i audyt'
);

select * from finish();
rollback;
