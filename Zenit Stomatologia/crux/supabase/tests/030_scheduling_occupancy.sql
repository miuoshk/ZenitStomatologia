-- [F0-010] RLS + EXCLUDE chair_occupancy (K11)
begin;
select plan(7);

select tests.clear_authentication();

-- Tenants / locations / staff (jak 020)
insert into org.tenants (id, name, legal_name, dek_key_id) values
  ('cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'occ_a', 'Occ A', 'local-v1'),
  ('dddddddd-dddd-7ddd-8ddd-ddddddddddd1'::uuid, 'occ_b', 'Occ B', 'local-v1');

insert into org.locations (id, tenant_id, number, name, address, color_key) values
  ('cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, '01', 'N1', '{}'::jsonb, 'loc1'),
  ('cccccccc-cccc-7ccc-8ccc-cccccccccc02'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, '02', 'N2', '{}'::jsonb, 'loc2'),
  ('dddddddd-dddd-7ddd-8ddd-dddddddddd01'::uuid, 'dddddddd-dddd-7ddd-8ddd-ddddddddddd1'::uuid, '01', 'B1', '{}'::jsonb, 'loc1');

insert into org.chairs (id, tenant_id, location_id, name, position) values
  ('cccccccc-cccc-7ccc-8ccc-cccccccccd01'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'F1', 1),
  ('cccccccc-cccc-7ccc-8ccc-cccccccccd02'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'F2', 2),
  ('cccccccc-cccc-7ccc-8ccc-cccccccccd03'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc02'::uuid, 'F1', 1);

insert into identity.staff_members (id, tenant_id, first_name, last_name, email) values
  ('cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'Rec', '01', 'r01@a.pl'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccce02'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'Rec', '02', 'r02@a.pl'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'Den', 'A', 'da@a.pl'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccce04'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'Den', 'B', 'db@a.pl'),
  ('dddddddd-dddd-7ddd-8ddd-ddddddddde01'::uuid, 'dddddddd-dddd-7ddd-8ddd-ddddddddddd1'::uuid, 'Rec', 'B', 'rb@b.pl');

insert into identity.memberships (tenant_id, staff_id, location_id, role, starts_on) values
  ('cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'receptionist', '2026-01-01'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccce02'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc02'::uuid, 'receptionist', '2026-01-01'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'dentist', '2026-01-01'),
  ('cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid, 'cccccccc-cccc-7ccc-8ccc-ccccccccce04'::uuid, 'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid, 'dentist', '2026-01-01'),
  ('dddddddd-dddd-7ddd-8ddd-ddddddddddd1'::uuid, 'dddddddd-dddd-7ddd-8ddd-ddddddddde01'::uuid, 'dddddddd-dddd-7ddd-8ddd-dddddddddd01'::uuid, 'receptionist', '2026-01-01');

-- [F0-010/AC1] recepcja 01 zapisuje wpis
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccce01',
    'tenant_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1',
    'location_ids', json_build_array('cccccccc-cccc-7ccc-8ccc-cccccccccc01'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read', 'occupancy.write', 'occupancy.void', 'occupancy.close_day')
  )::text,
  true
);

select lives_ok(
  $$
    insert into scheduling.chair_occupancy (
      tenant_id, location_id, chair_id, provider_id, period, category, amount_grosze, source, created_by
    ) values (
      'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccd02'::uuid,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid,
      tstzrange('2026-11-12 10:00:00+01', '2026-11-12 11:00:00+01', '[)'),
      'Z3', 45000, 'manual',
      'cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid
    )
  $$,
  '[F0-010/AC1] zapis wpisu'
);

-- [F0-010/AC2] nakładanie
select throws_ok(
  $$
    insert into scheduling.chair_occupancy (
      tenant_id, location_id, chair_id, provider_id, period, category, amount_grosze, created_by
    ) values (
      'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccd02'::uuid,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid,
      tstzrange('2026-11-12 10:30:00+01', '2026-11-12 11:30:00+01', '[)'),
      'Z3', 10000,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid
    )
  $$,
  '23P01',
  null,
  '[F0-010/AC2] nakładanie → 23P01'
);

-- [F0-010/AC6] void + nowy wpis w tym samym okresie
select lives_ok(
  $$
    update scheduling.chair_occupancy
      set voided_at = now(),
          voided_by = 'cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid,
          void_reason = 'pomyłka fotela'
      where chair_id = 'cccccccc-cccc-7ccc-8ccc-cccccccccd02'::uuid
        and voided_at is null;
    insert into scheduling.chair_occupancy (
      tenant_id, location_id, chair_id, provider_id, period, category, created_by
    ) values (
      'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccd02'::uuid,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid,
      tstzrange('2026-11-12 10:00:00+01', '2026-11-12 11:00:00+01', '[)'),
      'Z1',
      'cccccccc-cccc-7ccc-8ccc-ccccccccce01'::uuid
    )
  $$,
  '[F0-010/AC6] unieważniony nie blokuje więzu'
);

-- seed wpis w gabinecie 02 (jako rec 02)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccce02',
    'tenant_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1',
    'location_ids', json_build_array('cccccccc-cccc-7ccc-8ccc-cccccccccc02'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read', 'occupancy.write')
  )::text,
  true
);

insert into scheduling.chair_occupancy (
  tenant_id, location_id, chair_id, period, category, created_by
) values (
  'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
  'cccccccc-cccc-7ccc-8ccc-cccccccccc02'::uuid,
  'cccccccc-cccc-7ccc-8ccc-cccccccccd03'::uuid,
  tstzrange('2026-11-12 09:00:00+01', '2026-11-12 10:00:00+01', '[)'),
  'Z1',
  'cccccccc-cccc-7ccc-8ccc-ccccccccce02'::uuid
);

-- [F0-010/AC4] recepcja 01 nie widzi 02
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccce01',
    'tenant_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1',
    'location_ids', json_build_array('cccccccc-cccc-7ccc-8ccc-cccccccccc01'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read', 'occupancy.write')
  )::text,
  true
);

select is(
  (select count(*)::int from scheduling.chair_occupancy
    where location_id = 'cccccccc-cccc-7ccc-8ccc-cccccccccc02'::uuid),
  0,
  '[F0-010/AC4] recepcja 01 nie widzi 02'
);

-- tenant B
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'dddddddd-dddd-7ddd-8ddd-ddddddddde01',
    'tenant_id', 'dddddddd-dddd-7ddd-8ddd-ddddddddddd1',
    'location_ids', json_build_array('dddddddd-dddd-7ddd-8ddd-dddddddddd01'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read', 'occupancy.write')
  )::text,
  true
);

select is(
  (select count(*)::int from scheduling.chair_occupancy
    where tenant_id = 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid),
  0,
  '[F0-010/AC4] tenant B nic nie widzi'
);

-- dentist write_own: cudzy provider → 42501
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccce03',
    'tenant_id', 'cccccccc-cccc-7ccc-8ccc-ccccccccccc1',
    'location_ids', json_build_array('cccccccc-cccc-7ccc-8ccc-cccccccccc01'),
    'role', 'dentist',
    'permissions', json_build_array('occupancy.read', 'occupancy.write_own', 'occupancy.void')
  )::text,
  true
);

select throws_ok(
  $$
    insert into scheduling.chair_occupancy (
      tenant_id, location_id, chair_id, provider_id, period, category, created_by
    ) values (
      'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccd01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce04'::uuid,
      tstzrange('2026-11-12 08:00:00+01', '2026-11-12 09:00:00+01', '[)'),
      'Z1',
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid
    )
  $$,
  '42501',
  null,
  '[F0-010] dentist nie zapisze cudzego provider_id'
);

-- dentist own OK
select lives_ok(
  $$
    insert into scheduling.chair_occupancy (
      tenant_id, location_id, chair_id, provider_id, period, category, created_by
    ) values (
      'cccccccc-cccc-7ccc-8ccc-ccccccccccc1'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccc01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-cccccccccd01'::uuid,
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid,
      tstzrange('2026-11-12 08:00:00+01', '2026-11-12 09:00:00+01', '[)'),
      'Z1',
      'cccccccc-cccc-7ccc-8ccc-ccccccccce03'::uuid
    )
  $$,
  'dentist zapisuje własne'
);

select * from finish();
rollback;
