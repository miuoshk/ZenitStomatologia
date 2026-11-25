-- K05 · platform / audit pgTAP
begin;
select plan(11);

select tests.clear_authentication();

select lives_ok($$ select tests.create_tenant('tenant_a') $$, 'tenant_a');
select lives_ok($$ select tests.create_tenant('tenant_b') $$, 'tenant_b');
select lives_ok($$ select tests.create_location(tests.tenant_a(), '01') $$, 'loc 01');

select lives_ok(
  $$
    select tests.create_staff(
      tests.tenant_a(),
      'receptionist',
      array[tests.location('01')],
      '["occupancy.read","settings.manage"]'::jsonb
    )
  $$,
  'staff A'
);

select lives_ok(
  $$
    select tests.create_staff(
      tests.tenant_b(),
      'receptionist',
      '{}'::uuid[],
      '["occupancy.read"]'::jsonb
    )
  $$,
  'staff B'
);

-- Trigger as migrator role (bypass): verify strip of sensitive columns
select lives_ok(
  $$
    insert into tests.audit_probe (tenant_id, label, pesel_enc, id_document_enc, note_enc, pesel_hmac)
    values (
      tests.tenant_a(),
      'probe',
      'ENC',
      'DOC',
      'NOTE',
      decode('abcd', 'hex')
    )
  $$,
  'insert audit_probe'
);

select ok(
  (
    select
      (after ? 'label')
      and not (after ? 'pesel_enc')
      and not (after ? 'id_document_enc')
      and not (after ? 'note_enc')
      and not (after ? 'pesel_hmac')
    from audit.events
    where table_name = 'tests.audit_probe'
      and tenant_id = tests.tenant_a()
    order by occurred_at desc
    limit 1
  ),
  'audit.track strips *_enc and pesel_hmac'
);

-- RLS path: SET ROLE authenticated (top-level, persists in transaction)
set local role authenticated;
select tests.authenticate_as(
  (select id from tests.staff where tenant_id = tests.tenant_a() order by id limit 1)
);

select throws_ok(
  $$ update audit.events set reason = 'x' where true $$,
  '42501',
  null,
  'authenticated cannot update audit.events'
);

select throws_ok(
  $$ delete from audit.events where true $$,
  '42501',
  null,
  'authenticated cannot delete audit.events'
);

select lives_ok(
  $$
    insert into platform.outbox (tenant_id, topic, payload)
    values (
      tests.tenant_a(),
      'platform.test.v1',
      '{"entityId":"01900000-0000-7000-8000-000000000001"}'::jsonb
    )
  $$,
  'outbox insert A'
);

select tests.authenticate_as(
  (select id from tests.staff where tenant_id = tests.tenant_b() order by id limit 1)
);

select is_empty(
  $$ select 1 from platform.outbox where tenant_id = tests.tenant_a() $$,
  'tenant B does not see tenant A outbox'
);

select * from finish();
rollback;
