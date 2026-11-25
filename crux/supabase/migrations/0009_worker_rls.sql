-- K09 · polityki RLS dla roli crux_worker (outbox dispatch + audyt backupów).

create policy outbox_worker_select on platform.outbox
  for select to crux_worker
  using (true);

create policy outbox_worker_update on platform.outbox
  for update to crux_worker
  using (true)
  with check (true);

create policy outbox_worker_insert on platform.outbox
  for insert to crux_worker
  with check (true);

create policy outbox_worker_delete on platform.outbox
  for delete to crux_worker
  using (true);

-- Worker zapisuje zdarzenia systemowe (backup.completed, outbox.dead) bezpośrednio.
create policy events_worker_insert on audit.events
  for insert to crux_worker
  with check (true);

create policy events_worker_select on audit.events
  for select to crux_worker
  using (true);

create policy integrity_worker_all on audit.integrity_checks
  for all to crux_worker
  using (true)
  with check (true);

grant insert, delete on platform.outbox to crux_worker;
