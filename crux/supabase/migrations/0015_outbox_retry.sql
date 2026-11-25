-- K15: ręczne „Ponów" martwych zdarzeń outbox (tylko integrations.manage, tylko dead → pending).
grant update (status, attempts, next_attempt_at, last_error) on platform.outbox to authenticated, crux_app;

create policy outbox_retry_dead on platform.outbox
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and status = 'dead'
    and extensions.has_permission('integrations.manage')
  )
  with check (
    tenant_id = extensions.tenant_id()
    and status = 'pending'
    and extensions.has_permission('integrations.manage')
  );
