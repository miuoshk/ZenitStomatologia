-- K06 · org/identity RLS pgTAP
begin;
select plan(8);

select tests.clear_authentication();

select lives_ok(
  $$
    insert into org.tenants (id, name, legal_name, dek_key_id)
    values (
      'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid,
      'tenant_a', 'Tenant A', 'local-v1'
    )
  $$,
  'tenant A'
);

select lives_ok(
  $$
    insert into org.tenants (id, name, legal_name, dek_key_id)
    values (
      'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbb1'::uuid,
      'tenant_b', 'Tenant B', 'local-v1'
    )
  $$,
  'tenant B'
);

select lives_ok(
  $$
    insert into org.locations (id, tenant_id, number, name, address, color_key)
    values
      ('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaa01'::uuid, 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid, '01', 'N1', '{}'::jsonb, 'loc1'),
      ('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaa02'::uuid, 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid, '02', 'N2', '{}'::jsonb, 'loc2'),
      ('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb01'::uuid, 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbb1'::uuid, '01', 'B1', '{}'::jsonb, 'loc1')
  $$,
  'locations'
);

select lives_ok(
  $$
    insert into identity.staff_members (id, tenant_id, first_name, last_name, email)
    values
      ('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaab01'::uuid, 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid, 'R', 'A', 'ra@a.pl'),
      ('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb02'::uuid, 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbb1'::uuid, 'R', 'B', 'rb@b.pl')
  $$,
  'staff'
);

select lives_ok(
  $$
    insert into identity.memberships (tenant_id, staff_id, location_id, role, starts_on)
    values
      (
        'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid,
        'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaab01'::uuid,
        'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaa01'::uuid,
        'receptionist',
        '2026-01-01'
      ),
      (
        'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbb1'::uuid,
        'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb02'::uuid,
        'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb01'::uuid,
        'receptionist',
        '2026-01-01'
      )
  $$,
  'memberships'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaab01',
    'tenant_id', 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1',
    'location_ids', json_build_array('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaa01'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read')
  )::text,
  true
);

select isnt_empty(
  $$ select 1 from org.locations where number = '02' $$,
  'staff A sees location 02 config'
);

select is_empty(
  $$
    select 1 from identity.memberships
    where location_id = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaa02'::uuid
  $$,
  'staff A without membership in 02 does not see memberships for 02'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'staff_id', 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb02',
    'tenant_id', 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbb1',
    'location_ids', json_build_array('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbb01'),
    'role', 'receptionist',
    'permissions', json_build_array('occupancy.read')
  )::text,
  true
);

select is_empty(
  $$ select 1 from org.locations where tenant_id = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaa1'::uuid $$,
  'tenant B does not see tenant A locations'
);

select * from finish();
rollback;
