-- [F0-011] analytics: widoki per rola + RLS (K13)
begin;
select plan(17);

select tests.clear_authentication();

-- Słowniki
select is((select count(*)::int from analytics.dim_date), 7671, 'dim_date wypełniona 2020-01-01…2040-12-31');
select is((select count(*)::int from analytics.dim_category), 6, 'dim_category Z1…Z+');
select ok((select is_holiday and not is_working_day from analytics.dim_date where date_key = '2026-04-06'), 'Poniedziałek Wielkanocny = święto');
select ok((select is_working_day from analytics.dim_date where date_key = '2026-11-12'), 'czwartek 12.11.2026 = dzień roboczy');
select hasnt_column('analytics', 'dim_provider', 'first_name', 'dim_provider bez first_name');

-- Org + identity (prawdziwe wiersze, jak w 030)
insert into org.tenants (id, name, legal_name, dek_key_id) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'an_a', 'An A', 'local-v1'),
  ('ffffffff-ffff-7fff-8fff-fffffffffff1'::uuid, 'an_b', 'An B', 'local-v1');

insert into org.locations (id, tenant_id, number, name, address, color_key) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, '01', 'N1', '{}'::jsonb, '01'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, '02', 'N2', '{}'::jsonb, '02'),
  ('ffffffff-ffff-7fff-8fff-ffffffffff01'::uuid, 'ffffffff-ffff-7fff-8fff-fffffffffff1'::uuid, '01', 'B1', '{}'::jsonb, 'loc1');

insert into org.chairs (id, tenant_id, location_id, name, position) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeed01'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'F1', 1),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeed02'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid, 'F1', 1),
  ('ffffffff-ffff-7fff-8fff-ffffffffffd1'::uuid, 'ffffffff-ffff-7fff-8fff-fffffffffff1'::uuid, 'ffffffff-ffff-7fff-8fff-ffffffffff01'::uuid, 'F1', 1);

insert into identity.staff_members (id, tenant_id, first_name, last_name, email) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb01'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'Man', '01', 'm01@a.pl'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb02'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'Rec', '01', 'r01@a.pl'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'Den', 'A', 'da@a.pl'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb04'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'Den', 'B', 'db@a.pl'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb05'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'Net', 'Adm', 'na@a.pl'),
  ('ffffffff-ffff-7fff-8fff-ffffffffffb1'::uuid, 'ffffffff-ffff-7fff-8fff-fffffffffff1'::uuid, 'Den', 'Z', 'dz@b.pl');

insert into identity.memberships (tenant_id, staff_id, location_id, role, starts_on) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb01'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'location_manager', '2026-01-01'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb02'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'receptionist', '2026-01-01'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'dentist', '2026-01-01'),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb04'::uuid, 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'::uuid, 'dentist', '2026-01-01'),
  ('ffffffff-ffff-7fff-8fff-fffffffffff1'::uuid, 'ffffffff-ffff-7fff-8fff-ffffffffffb1'::uuid, 'ffffffff-ffff-7fff-8fff-ffffffffff01'::uuid, 'dentist', '2026-01-01');

-- Fakty (jako właściciel — omija RLS): 2 wykonawców w 01, 1 wpis w 02, 1 wpis w tenancie B
insert into analytics.fact_chair_occupancy
  (tenant_id, location_id, chair_key, date_key, provider_key, category_key, occupied_minutes, amount_grosze, entries, source, refreshed_at)
values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed01', '2026-11-12', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03', 'Z3', 60, 45000, 1, 'manual', now()),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed01', '2026-11-12', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb04', 'Z1', 120, 20000, 2, 'manual', now()),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed01', '2026-11-13', '00000000-0000-7000-8000-000000000000', 'Z2', 60, 0, 1, 'manual', now()),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed02', '2026-11-12', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03', 'Z5', 60, 90000, 1, 'manual', now()),
  ('ffffffff-ffff-7fff-8fff-fffffffffff1', 'ffffffff-ffff-7fff-8fff-ffffffffff01', 'ffffffff-ffff-7fff-8fff-ffffffffffd1', '2026-11-12', 'ffffffff-ffff-7fff-8fff-ffffffffffb1', 'Z1', 60, 1000, 1, 'manual', now());

insert into analytics.fact_chair_capacity
  (tenant_id, location_id, chair_key, date_key, open_minutes, blocked_minutes, available_minutes, refreshed_at)
values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed01', '2026-11-12', 600, 0, 600, now()),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeed02', '2026-11-12', 600, 60, 540, now());

insert into analytics.fact_day_closures (tenant_id, location_id, date_key, closed, closed_at, refreshed_at)
values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', '2026-11-12', true, now(), now()),
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02', '2026-11-12', true, now(), now());

insert into analytics.dim_provider (provider_key, tenant_id, display_name, role) values
  ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'Den A', 'dentist'),
  ('ffffffff-ffff-7fff-8fff-ffffffffffb1', 'ffffffff-ffff-7fff-8fff-fffffffffff1', 'Den Z', 'dentist');

set local role authenticated;

-- [F0-011/AC3] lekarz A: v_self_occupancy tylko własne wiersze (2: gabinet 01 i 02)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03',
    'tenant_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1',
    'location_ids', json_build_array('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'),
    'role', 'dentist',
    'permissions', json_build_array('analytics.view_self')
  )::text,
  true
);

select is(
  (select count(*)::int from analytics.v_self_occupancy
    where provider_key <> 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb03'::uuid),
  0,
  '[F0-011/AC3] lekarz: v_self_occupancy bez cudzych wierszy'
);
select is(
  (select count(*)::int from analytics.v_self_occupancy),
  2,
  '[F0-011/AC3] lekarz widzi własne wiersze'
);
select is(
  (select count(*)::int from analytics.fact_chair_occupancy
    where provider_key = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb04'::uuid),
  0,
  '[F0-011/AC3] lekarz: RLS faktu nie pokazuje wykonawcy B'
);
select is(
  (select count(*)::int from analytics.fact_chair_capacity) +
  (select count(*)::int from analytics.fact_day_closures),
  0,
  '[F0-011/AC3] lekarz bez view_location nie widzi pojemności ani zamknięć'
);

-- Kierownik 01
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb01',
    'tenant_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1',
    'location_ids', json_build_array('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'),
    'role', 'location_manager',
    'permissions', json_build_array('analytics.view_location', 'analytics.view_self')
  )::text,
  true
);

select is(
  (select count(*)::int from analytics.v_location_occupancy
    where location_id = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid),
  0,
  '[F0-011/AC3] kierownik 01 nie widzi obłożenia 02 (v_location_occupancy)'
);
select is(
  (select count(*)::int from analytics.v_location_occupancy),
  3,
  'kierownik 01 widzi 3 wiersze obłożenia gabinetu 01'
);
select is(
  (select count(*)::int from analytics.v_location_capacity where location_id = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid)
  + (select count(*)::int from analytics.v_location_day_closures where location_id = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid),
  0,
  '[F0-011/AC3] kierownik 01 nie widzi pojemności ani zamknięć 02'
);
select is(
  (select count(*)::int from analytics.v_network_occupancy),
  0,
  'kierownik bez analytics.view_network: v_network_* puste'
);

-- Recepcja 01 (uprawnienie analytics.view_location nadane tylko na potrzeby testu izolacji)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb02',
    'tenant_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1',
    'location_ids', json_build_array('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01'),
    'role', 'receptionist',
    'permissions', json_build_array('analytics.view_location')
  )::text,
  true
);

select is(
  (select count(*)::int from analytics.v_location_capacity
    where location_id = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'::uuid),
  0,
  '[F0-011/AC3] recepcja 01 nie widzi pojemności 02'
);

-- Zarząd (sieć): oba gabinety tenanta A, bez tenanta B
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeb05',
    'tenant_id', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1',
    'location_ids', json_build_array('eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee02'),
    'role', 'network_admin',
    'permissions', json_build_array('analytics.view_network', 'network.view')
  )::text,
  true
);

select is(
  (select count(*)::int from analytics.v_network_occupancy),
  4,
  'zarząd: v_network_occupancy = oba gabinety tenanta A (bez tenanta B)'
);
select is(
  (select count(*)::int from analytics.dim_provider),
  1,
  'dim_provider: tylko wykonawcy własnego tenanta'
);

-- Zapis do faktów zabroniony dla authenticated
select throws_ok(
  $$ insert into analytics.fact_day_closures (tenant_id, location_id, date_key, closed, refreshed_at)
     values ('eeeeeeee-eeee-7eee-8eee-eeeeeeeeeee1', 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeee01', '2026-11-14', true, now()) $$,
  '42501',
  null,
  'authenticated nie zapisuje faktów analytics'
);

-- (polityki workera: test integracyjny w packages/modules/analytics — pgTAP działa jako postgres,
-- bez członkostwa w crux_worker)

select * from finish();
rollback;
