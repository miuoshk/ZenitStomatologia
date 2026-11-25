-- K07 · bootstrap Actor z auth_user_id (chicken-egg RLS: brak claims przed buildClaims).
-- Jedyna ścieżka odczytu staff/memberships bez gotowego JWT; security definer + grant tylko crux_app.

create or replace function identity.resolve_actor(
  p_auth_user_id uuid,
  p_active_location_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = identity, extensions, public
as $$
declare
  v_staff identity.staff_members%rowtype;
  v_today date := (timezone('Europe/Warsaw', now()))::date;
  v_location_ids uuid[];
  v_active uuid;
  v_role identity.staff_role;
  v_perms text[];
begin
  select * into v_staff
  from identity.staff_members
  where auth_user_id = p_auth_user_id and active = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(array_agg(distinct m.location_id), '{}'::uuid[])
  into v_location_ids
  from identity.memberships m
  where m.staff_id = v_staff.id
    and m.tenant_id = v_staff.tenant_id
    and m.starts_on <= v_today
    and (m.ends_on is null or m.ends_on >= v_today);

  if p_active_location_id is not null and p_active_location_id = any (v_location_ids) then
    v_active := p_active_location_id;
  elsif cardinality(v_location_ids) > 0 then
    v_active := v_location_ids[1];
  else
    v_active := coalesce(p_active_location_id, v_staff.tenant_id);
  end if;

  select m.role into v_role
  from identity.memberships m
  where m.staff_id = v_staff.id
    and m.location_id = v_active
    and m.starts_on <= v_today
    and (m.ends_on is null or m.ends_on >= v_today)
  order by m.starts_on desc
  limit 1;

  if v_role is null then
    select m.role into v_role
    from identity.memberships m
    where m.staff_id = v_staff.id
      and m.starts_on <= v_today
      and (m.ends_on is null or m.ends_on >= v_today)
    order by m.starts_on desc
    limit 1;
  end if;

  v_role := coalesce(v_role, 'receptionist');

  select coalesce(array_agg(distinct rp.permission), '{}'::text[])
  into v_perms
  from identity.memberships m
  join identity.role_permissions rp on rp.role = m.role
  where m.staff_id = v_staff.id
    and m.starts_on <= v_today
    and (m.ends_on is null or m.ends_on >= v_today)
    and (
      m.location_id = v_active
      or not exists (
        select 1 from identity.memberships m2
        where m2.staff_id = v_staff.id
          and m2.location_id = v_active
          and m2.starts_on <= v_today
          and (m2.ends_on is null or m2.ends_on >= v_today)
      )
    );

  return jsonb_build_object(
    'staffId', v_staff.id,
    'tenantId', v_staff.tenant_id,
    'locationIds', to_jsonb(v_location_ids),
    'activeLocationId', v_active,
    'role', v_role::text,
    'permissions', to_jsonb(v_perms)
  );
end;
$$;

revoke all on function identity.resolve_actor(uuid, uuid) from public;
grant execute on function identity.resolve_actor(uuid, uuid) to crux_app;

comment on function identity.resolve_actor(uuid, uuid) is
  'K07 bootstrap: Actor JSON for requireActor; security definer; crux_app only';
