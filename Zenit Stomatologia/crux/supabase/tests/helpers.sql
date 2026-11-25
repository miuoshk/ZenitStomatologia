-- K02 · verifies harness from migration 0002_pgtap.sql (functions in schema tests).

begin;
select plan(8);

select has_schema('tests', 'schema tests exists');
select has_function('tests', 'create_tenant', array['text'], 'tests.create_tenant(text)');
select has_function('tests', 'create_location', array['uuid', 'text'], 'tests.create_location(uuid,text)');
select has_function(
  'tests',
  'create_staff',
  array['uuid', 'text', '_uuid', 'jsonb'],
  'tests.create_staff(tenant, role, locations, permissions)'
);
select has_function('tests', 'authenticate_as', array['uuid'], 'tests.authenticate_as(uuid)');
select has_function('tests', 'tenant_a', 'tests.tenant_a()');
select has_function('tests', 'tenant_b', 'tests.tenant_b()');
select has_function('tests', 'location', array['text'], 'tests.location(text)');

select * from finish();
rollback;
