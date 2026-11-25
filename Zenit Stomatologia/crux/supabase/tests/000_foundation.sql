-- K02 · extensions.* claims helpers with and without JWT claims

begin;
select plan(19);

-- Without claims
select tests.clear_authentication();
select is(extensions.tenant_id(), null, 'extensions.tenant_id() without claims is null');
select is(extensions.staff_id(), null, 'extensions.staff_id() without claims is null');
select is(extensions.role(), null, 'extensions.role() without claims is null');
select ok(extensions.location_ids() = '{}'::uuid[], 'extensions.location_ids() without claims is empty');
select ok(not extensions.has_permission('occupancy.read'), 'has_permission without claims is false');

-- Fixture
select lives_ok(
  $$ select tests.create_tenant('tenant_a') $$,
  'create tenant_a'
);
select lives_ok(
  $$ select tests.create_tenant('tenant_b') $$,
  'create tenant_b'
);
select lives_ok(
  $$ select tests.create_location(tests.tenant_a(), '01') $$,
  'create location 01'
);
select lives_ok(
  $$ select tests.create_location(tests.tenant_a(), '02') $$,
  'create location 02'
);

select isnt(tests.tenant_a(), null, 'tenant_a handle set');
select isnt(tests.location('01'), null, 'location 01 handle set');

select lives_ok(
  $$
    select tests.create_staff(
      tests.tenant_a(),
      'receptionist',
      array[tests.location('01')],
      '["occupancy.read"]'::jsonb
    )
  $$,
  'create staff with occupancy.read'
);

select lives_ok(
  $$
    select tests.authenticate_as(id)
    from tests.staff
    where tenant_id = tests.tenant_a()
      and role = 'receptionist'
    order by id
    limit 1
  $$,
  'authenticate_as receptionist'
);

-- Role switch must be outside a function (SET LOCAL ROLE does not stick across function return).
set local role authenticated;

select is(extensions.tenant_id(), tests.tenant_a(), 'extensions.tenant_id() matches fixture tenant');
select is(
  extensions.staff_id(),
  (select id from tests.staff where tenant_id = tests.tenant_a() and role = 'receptionist' order by id limit 1),
  'extensions.staff_id() matches fixture staff'
);
select is(extensions.role(), 'receptionist', 'extensions.role() matches fixture role');
select ok(tests.location('01') = any (extensions.location_ids()), 'extensions.location_ids() contains 01');
select ok(extensions.has_permission('occupancy.read'), 'has_permission occupancy.read true');
select ok(not extensions.has_permission('org.manage'), 'has_permission org.manage false');

select * from finish();
rollback;
