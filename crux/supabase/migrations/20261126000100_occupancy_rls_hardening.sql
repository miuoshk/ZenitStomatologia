-- Audyt 1.0 (2026-11-25) · uszczelnienie RLS obłożenia (F0-010, docs/03 §8)
--
-- 1. Wykonawca (dentist/hygienist: `write_own` + `void`) zmienia i unieważnia wyłącznie
--    własne wpisy. Wcześniej `occupancy.void` w USING wpuszczał UPDATE dowolnego wpisu
--    w gabinecie, a WITH CHECK nie sprawdzał `provider_id` (przepisanie wpisu na siebie).
-- 2. Dzień zamknięty chroni baza, nie tylko aplikacja: INSERT/UPDATE wpisu w zamkniętym
--    dniu wymaga `occupancy.write_closed` (docs/03: „wpis w dniu zamkniętym zmienia tylko
--    occupancy.write_closed”).
-- 3. Zamknięcia dnia nie da się przenieść do innego gabinetu (WITH CHECK z gabinetem).

-- ---------------------------------------------------------------------------
-- 1. chair_occupancy UPDATE
-- ---------------------------------------------------------------------------
drop policy chair_occupancy_update on scheduling.chair_occupancy;

create policy chair_occupancy_update on scheduling.chair_occupancy
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or extensions.has_permission('occupancy.write_closed')
      or (
        provider_id = extensions.staff_id()
        and (
          extensions.has_permission('occupancy.write_own')
          or extensions.has_permission('occupancy.void')
        )
      )
    )
  )
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and (
      extensions.has_permission('occupancy.write')
      or extensions.has_permission('occupancy.write_closed')
      or provider_id = extensions.staff_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Dzień zamknięty: strażnik w bazie
-- ---------------------------------------------------------------------------
create or replace function scheduling.occupancy_day_is_closed(p_location_id uuid, p_period tstzrange)
returns boolean
language sql
stable
set search_path = scheduling, public
as $$
  select exists (
    select 1
    from scheduling.occupancy_day_closures c
    where c.location_id = p_location_id
      and c.day = (lower(p_period) at time zone 'Europe/Warsaw')::date
      and c.reopened_at is null
  );
$$;

revoke all on function scheduling.occupancy_day_is_closed(uuid, tstzrange) from public;
grant execute on function scheduling.occupancy_day_is_closed(uuid, tstzrange)
  to authenticated, crux_app, crux_worker;

create or replace function scheduling.guard_closed_day()
returns trigger
language plpgsql
set search_path = scheduling, extensions, public
as $$
begin
  -- Strażnik dotyczy sesji użytkowników (withActor → `authenticated`).
  -- Worker, migracje i seedy (postgres) przechodzą bez zmian.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if extensions.has_permission('occupancy.write_closed') then
    return new;
  end if;
  if scheduling.occupancy_day_is_closed(new.location_id, new.period) then
    raise exception 'day_closed' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and scheduling.occupancy_day_is_closed(old.location_id, old.period) then
    raise exception 'day_closed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function scheduling.guard_closed_day() from public;

create trigger chair_occupancy_guard_closed_day
  before insert or update on scheduling.chair_occupancy
  for each row execute function scheduling.guard_closed_day();

-- ---------------------------------------------------------------------------
-- 3. Zamknięcie dnia zostaje w swoim gabinecie
-- ---------------------------------------------------------------------------
drop policy day_closures_update on scheduling.occupancy_day_closures;

create policy day_closures_update on scheduling.occupancy_day_closures
  for update to authenticated
  using (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
    and extensions.has_permission('occupancy.write_closed')
  )
  with check (
    tenant_id = extensions.tenant_id()
    and (
      location_id = any (extensions.location_ids())
      or extensions.has_permission('network.view')
    )
  );
