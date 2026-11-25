-- K06 · seed permissions + role_permissions (docs/03 §8)

insert into identity.permissions (key, description) values
  ('org.manage', 'Gabinety, fotele, godziny'),
  ('staff.manage', 'Konta, role, członkostwa'),
  ('settings.manage', 'Flagi, ustawienia, cele'),
  ('audit.read', 'Odczyt audytu i logu dostępu'),
  ('patient.read', 'Odczyt pacjentów'),
  ('patient.write', 'Zapis pacjentów'),
  ('patient.merge', 'Scalanie pacjentów'),
  ('appointment.read', 'Odczyt terminów'),
  ('appointment.create', 'Tworzenie terminów'),
  ('appointment.move', 'Przenoszenie terminów'),
  ('appointment.cancel', 'Anulowanie terminów'),
  ('appointment.override_hours', 'Terminy poza godzinami'),
  ('occupancy.read', 'Odczyt obłożenia'),
  ('occupancy.write', 'Zapis obłożenia'),
  ('occupancy.write_own', 'Zapis własnego obłożenia'),
  ('occupancy.void', 'Unieważnienie wpisu obłożenia'),
  ('occupancy.close_day', 'Zamknięcie dnia obłożenia'),
  ('occupancy.write_closed', 'Edycja po zamknięciu dnia'),
  ('occupancy.override_hours', 'Obłożenie poza godzinami'),
  ('lab_order.read', 'Odczyt zleceń lab'),
  ('lab_order.write', 'Zapis zleceń lab'),
  ('lab_order.cost', 'Koszty zleceń lab'),
  ('network.view', 'Przełącznik cała sieć'),
  ('analytics.view_self', 'Analityka własna'),
  ('analytics.view_location', 'Analityka gabinetu'),
  ('analytics.view_network', 'Analityka sieci'),
  ('analytics.export', 'Eksport analityki'),
  ('integrations.manage', 'Integracje')
on conflict (key) do nothing;

-- Helper: insert role_permission if missing
create or replace function identity._seed_rp(p_role identity.staff_role, p_perm text)
returns void language sql as $$
  insert into identity.role_permissions (role, permission)
  values (p_role, p_perm)
  on conflict do nothing;
$$;

-- network_admin (sieć)
select identity._seed_rp('network_admin', x) from unnest(array[
  'org.manage','staff.manage','settings.manage','audit.read',
  'occupancy.read','occupancy.write','occupancy.void','occupancy.close_day',
  'occupancy.write_closed','occupancy.override_hours',
  'analytics.view_network','analytics.export','network.view','integrations.manage',
  'patient.read','patient.write','patient.merge',
  'appointment.read','appointment.create','appointment.move','appointment.cancel',
  'appointment.override_hours',
  'lab_order.read','lab_order.write','lab_order.cost'
]) as x;

-- location_manager (gabinet)
select identity._seed_rp('location_manager', x) from unnest(array[
  'audit.read',
  'occupancy.read','occupancy.write','occupancy.void','occupancy.close_day',
  'occupancy.write_closed','occupancy.override_hours',
  'analytics.view_location','analytics.export',
  'patient.read','patient.write','patient.merge',
  'appointment.read','appointment.create','appointment.move','appointment.cancel',
  'appointment.override_hours',
  'lab_order.read','lab_order.write','lab_order.cost'
]) as x;

-- receptionist
select identity._seed_rp('receptionist', x) from unnest(array[
  'occupancy.read','occupancy.write','occupancy.void','occupancy.close_day',
  'patient.read','patient.write','patient.merge',
  'appointment.read','appointment.create','appointment.move','appointment.cancel',
  'lab_order.read'
]) as x;

-- dentist / hygienist
select identity._seed_rp(r, x) from
  unnest(array['dentist','hygienist']::identity.staff_role[]) as r,
  unnest(array[
    'occupancy.read','occupancy.write_own','occupancy.void',
    'analytics.view_self',
    'patient.read','patient.write',
    'appointment.read',
    'lab_order.read','lab_order.write'
  ]) as x;

-- assistant
select identity._seed_rp('assistant', x) from unnest(array[
  'occupancy.read',
  'patient.read',
  'appointment.read',
  'lab_order.read','lab_order.write'
]) as x;

-- accountant
select identity._seed_rp('accountant', x) from unnest(array[
  'occupancy.read',
  'analytics.view_network','analytics.export','network.view'
]) as x;

-- auditor
select identity._seed_rp('auditor', x) from unnest(array[
  'audit.read','occupancy.read','network.view'
]) as x;

drop function identity._seed_rp(identity.staff_role, text);
