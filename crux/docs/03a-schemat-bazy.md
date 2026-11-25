# 03a · Schemat bazy (poziom DDL)

Wersja 1.1 · 6 listopada 2026. Wiążący szkic tabel dla faz F0–F3 i zarys F4–F5 (co wchodzi w wydanie 1.0: tabele oznaczone „1.0” w sekcjach 1–3, 5, 12). Cursor generuje z niego schemat Drizzle (`packages/db/src/schema/<moduł>.ts`) i migracje. Jeśli implementacja wymaga odstępstwa, najpierw poprawiamy ten plik (w tym samym PR). Typy: PostgreSQL 17. Konwencje: `03-model-domeny.md`, sekcja 5.

## 0. Fundament: rozszerzenia, funkcje, wzorce RLS

```sql
create extension if not exists btree_gist;     -- więzy wykluczające na zakresach
create extension if not exists pg_trgm;        -- wyszukiwanie pacjentów
create extension if not exists pgcrypto;
create extension if not exists pgaudit;        -- DDL i role, bez parametrów zapytań
create schema if not exists ref; create schema if not exists audit;
create schema if not exists platform; create schema if not exists analytics;

-- UUIDv7 (do czasu Postgresa 18: funkcja własna w schemacie extensions)
create or replace function extensions.uuid_generate_v7() returns uuid ...;

-- Claims ustawiane przez withActor() w każdej transakcji:
-- set local role authenticated;
-- set local request.jwt.claims = '{"staff_id":"…","tenant_id":"…","location_ids":["…"],"role":"receptionist","permissions":["appointment.create",…]}';
create or replace function auth.tenant_id() returns uuid language sql stable as
  $$ select (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid $$;
create or replace function auth.staff_id() returns uuid ...;
create or replace function auth.location_ids() returns uuid[] ...;
create or replace function auth.has_permission(p text) returns boolean ...;

-- Role bazy:
--   crux_app     LOGIN, member of authenticated (web)      — RLS obowiązuje
--   crux_worker  LOGIN, własna rola z politykami workera   — tylko operacje z privileged.ts
--   authenticated: bez BYPASSRLS, bez UPDATE/DELETE na tabelach tylko do dopisywania
```

**Wzorce polityk** (nazwy używane w testach pgTAP):

| Wzorzec | Kiedy | Polityka |
|---|---|---|
| `tenant_all` | dane pacjenta wspólne dla całego tenanta (patients, plans, charges…) | `using (tenant_id = auth.tenant_id())` dla select/insert/update |
| `tenant_location` | dane operacyjne gabinetu (appointments, lab_orders, payments) | `using (tenant_id = auth.tenant_id() and (location_id = any(auth.location_ids()) or auth.has_permission('network.view')))` |
| `append_only` | wersje, zgody, płatności, audyt | tylko `select` i `insert`; `revoke update, delete … from authenticated` |
| `self_or_manager` | dane wykonawcy (rozliczenia, wyniki) | `using (provider_id = auth.staff_id() or auth.has_permission('settlement.view_all'))` |
| `ref_read` | słowniki | `grant select on all tables in schema ref to authenticated`, bez RLS |

Każda tabela ma komentarz `comment on table … is 'rls: tenant_location; append_only: no; retention: 20y'`. `crux-doctor` czyta te komentarze.

## 1. Platforma (`platform`, `audit`) — F0

```sql
create table platform.outbox (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  topic text not null,                       -- 'appointment.booked.v1'
  payload jsonb not null,                    -- tylko identyfikatory
  dedupe_key text,                           -- np. 'sms.reminder:<appointment_id>:48h'
  status text not null default 'pending',    -- pending|sent|dead
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,                           -- bez danych osobowych
  created_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);
create index on platform.outbox (status, next_attempt_at);

create table platform.command_log (            -- idempotencja komend
  command_id uuid primary key, tenant_id uuid not null, actor_id uuid not null,
  name text not null, result jsonb not null, created_at timestamptz not null default now()
);

create table platform.feature_flags (
  key text not null, tenant_id uuid, location_id uuid, enabled boolean not null default false,
  payload jsonb, updated_at timestamptz, updated_by uuid,
  primary key (key, coalesce(tenant_id,'00000000-…'), coalesce(location_id,'00000000-…'))
);

create table platform.settings (                 -- ustawienia tenanta/gabinetu (klucz → jsonb)
  tenant_id uuid not null, location_id uuid, key text not null, value jsonb not null,
  updated_at timestamptz, updated_by uuid, primary key (tenant_id, coalesce(location_id, …), key)
);

create table audit.events (                      -- append_only, bez RLS select dla authenticated poza rolą audytora
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, actor_id uuid, actor_role text,
  table_name text not null, row_id uuid not null, action text not null,  -- insert|update|delete|sign|reverse
  before jsonb, after jsonb, reason text, request_id text,
  occurred_at timestamptz not null default now()
);
create index on audit.events (tenant_id, table_name, row_id);

create table audit.access_log (                  -- komponent logowania (EHDS art. 9), append_only
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, actor_id uuid not null, location_id uuid,
  patient_id uuid not null, resource text not null,      -- 'patient_record'|'clinical_entry'|'file'|'imaging_study'|'export'|'print'
  resource_id uuid, action text not null,                -- view|print|export|download
  justification text,                                    -- break-glass
  ip_hash bytea, user_agent_hash bytea,
  occurred_at timestamptz not null default now()
);
create index on audit.access_log (tenant_id, patient_id, occurred_at);
create index on audit.access_log (tenant_id, actor_id, occurred_at);

create table audit.integrity_checks (
  id uuid primary key, tenant_id uuid not null, patient_id uuid, checked_at timestamptz not null,
  ok boolean not null, broken_at_version_id uuid, details text
);
```

Trigger audytu `audit.track()` zakładany na każdej tabeli z danymi pacjenta, dokumentacją i finansami (`after insert or update or delete`). Dla tabel append-only `update`/`delete` i tak są odebrane; trigger dokumentuje `insert`.

## 2. Organizacja (`org`) — F0

```sql
create table tenants (
  id uuid primary key default extensions.uuid_generate_v7(),
  name text not null, legal_name text not null, nip text, regon text, rpwdl_book_number text,
  address jsonb, time_zone text not null default 'Europe/Warsaw',
  dek_key_id text not null,                  -- identyfikator klucza danych w KMS (ADR-025)
  created_at timestamptz not null default now()
);                                           -- rls: polityka select własnego tenanta

create table locations (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null references tenants,
  number text not null,                      -- '01', '02'; stałe na zawsze
  name text not null,                        -- 'Nowodworska' (01, baza sieci); 'Białowieska' (02)
  resort_code text,                          -- kod resortowy (cz. VII) do P1
  address jsonb not null, phone text, email text,
  geo point,                                 -- odległość w findFreeSlots
  color_key text not null,                   -- 'loc1'…'loc4' (06, paleta gabinetów)
  active boolean not null default true, opened_on date,
  created_at timestamptz not null default now(), updated_at timestamptz, updated_by uuid,
  unique (tenant_id, number)
);

create table chairs (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  name text not null,                        -- 'Fotel 1'
  position int not null,                     -- kolejność kolumn w terminarzu
  equipment text[] not null default '{}',    -- 'rvg','microscope','scanner','cbct'
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz, updated_by uuid,
  unique (location_id, name)
);

create table opening_hours (                 -- tygodniowy wzorzec
  id uuid primary key, tenant_id uuid not null, location_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  opens time not null, closes time not null, check (opens < closes),
  valid_from date not null, valid_to date
);
create table opening_exceptions (            -- święta, dni skrócone
  id uuid primary key, tenant_id uuid not null, location_id uuid not null,
  day date not null, opens time, closes time, closed boolean not null default false, reason text,
  unique (location_id, day)
);
```

## 3. Tożsamość i dostęp (`identity`) — F0

```sql
create type staff_role as enum ('network_admin','location_manager','dentist','hygienist','assistant','receptionist','accountant','auditor');

create table staff_members (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  auth_user_id uuid unique,                  -- Supabase auth.users.id
  first_name text not null, last_name text not null, display_name text,
  title text,                                -- 'lek. dent.', 'hig.'
  npwz text,                                 -- numer prawa wykonywania zawodu (unikalny w tenancie)
  email text not null, phone text,
  color_key text,                            -- kolor w grafiku (opcjonalny)
  active boolean not null default true, deactivated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz, updated_by uuid,
  unique (tenant_id, npwz)
);

create table memberships (
  id uuid primary key, tenant_id uuid not null,
  staff_id uuid not null references staff_members, location_id uuid not null references locations,
  role staff_role not null,
  starts_on date not null, ends_on date,     -- automatyczne wygaszenie
  unique (staff_id, location_id, role)
);

create table permissions (key text primary key, description text not null);          -- 'appointment.create', 'clinical_entry.sign'…
create table role_permissions (role staff_role not null, permission text not null references permissions, primary key (role, permission));

create table provider_capabilities (        -- jakie kategorie usług może wykonywać wykonawca
  tenant_id uuid not null, staff_id uuid not null references staff_members,
  service_category text not null,          -- 'Z1'…'Z+'
  primary key (staff_id, service_category)
);

create table break_glass_requests (         -- dostęp awaryjny poza własny gabinet
  id uuid primary key, tenant_id uuid not null, staff_id uuid not null, patient_id uuid not null,
  reason text not null, granted_until timestamptz not null, created_at timestamptz not null default now()
);
```

Uprawnienia są danymi: lista startowa w `packages/modules/identity/src/permissions.ts` (seed) i w każdym module `permissions.ts`. `authorize()` czyta z claims (`permissions[]`), które `withActor` buduje z `memberships` × `role_permissions` dla aktywnego gabinetu.

## 4. Pacjenci (`patients`) — F1

```sql
create type sex as enum ('F','M','X');

create sequence patient_number_seq;          -- per tenant przez tabelę liczników (patient_counters)

create table patients (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null,
  patient_number text not null,              -- 'ZS-000123', generowany w withActor przez licznik tenanta
  first_name text not null, middle_name text, last_name text not null,
  birth_date date not null, sex sex not null,
  pesel_enc text, pesel_hmac bytea,          -- ADR-025; null gdy brak PESEL
  id_document_type text, id_document_enc text,
  phone text, phone_secondary text, email text,          -- E.164
  address jsonb,
  preferred_channel text not null default 'sms',         -- sms|email|phone|none
  preferred_language text not null default 'pl',
  home_location_id uuid references locations,
  acquisition_source text,                               -- 'znanylekarz','google','referral','website','walk_in','other'
  acquisition_detail text,
  notes_reception text,                                  -- bez treści medycznych
  flags text[] not null default '{}',                    -- 'vip','debt_block','deceased'
  deceased_at date,
  merged_into_id uuid references patients,
  search tsvector generated always as (to_tsvector('simple', unaccent(coalesce(last_name,'')||' '||coalesce(first_name,'')||' '||coalesce(patient_number,'')))) stored,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid,
  unique (tenant_id, patient_number),
  unique (tenant_id, pesel_hmac)
);
create index on patients using gin (search);
create index on patients using gin (last_name gin_trgm_ops);
create index on patients (tenant_id, phone);
create index on patients (tenant_id, birth_date, last_name);   -- wykrywanie duplikatów

create table guardians (
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  first_name text not null, last_name text not null, relation text not null,   -- parent|legal_guardian
  phone text, email text, pesel_enc text, valid_until date,
  created_at timestamptz not null default now(), created_by uuid
);

create table patient_authorizations (       -- upoważnienia do informacji / dokumentacji; append_only + revoked_at
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  person_name text not null, person_phone text, scope text not null,  -- 'information'|'documentation'|'both'
  granted_at timestamptz not null, revoked_at timestamptz, document_file_id uuid,
  created_at timestamptz not null default now(), created_by uuid
);

create table patient_merges (               -- append_only
  id uuid primary key, tenant_id uuid not null, source_patient_id uuid not null, target_patient_id uuid not null,
  reason text not null, merged_at timestamptz not null default now(), merged_by uuid not null
);
```

## 5. Terminarz (`scheduling`) — od 1.0 obłożenie, od F1 (1.1) wizyty

### 5.1 Obłożenie godzinowe foteli — 1.0 (F0-010)

```sql
create type occupancy_source as enum ('manual','appointment','import');

create table time_blocks (                  -- 1.0: fotel (serwis, zamknięcie, szkolenie, inne); 1.1: także wykonawca (urlop, przerwa)
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  staff_id uuid references staff_members, chair_id uuid references chairs,
  period tstzrange not null, kind text not null,        -- 'service'|'closed'|'training'|'other'|'leave'|'break'
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now(), created_by uuid, ended_at timestamptz, ended_by uuid,
  check (staff_id is not null or chair_id is not null),
  check (lower(period) < upper(period))
);
create index on time_blocks (tenant_id, location_id, lower(period));

create table chair_occupancy (              -- wpis obłożenia: jak pracował fotel; bez pacjenta (ADR-032)
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  chair_id uuid not null references chairs,
  provider_id uuid references staff_members,            -- wykonawca; null = nieprzypisany
  period tstzrange not null,                             -- [start, end); 1.0: pełne godziny lokalne (pilnuje tego domena, w bazie bez więzu)
  category text not null,                                -- 'Z1'…'Z+'
  amount_grosze bigint check (amount_grosze >= 0),       -- przychód zrealizowany przypisany do wpisu; null = nie wpisano
  source occupancy_source not null default 'manual',
  appointment_id uuid,                                   -- od 1.1 (FK do appointments dodawany w F1-002, expand)
  override_reason text,                                  -- gdy poza godzinami otwarcia (kierownik)
  note text check (char_length(note) <= 80),             -- organizacyjna; walidacja containsPii w domenie
  voided_at timestamptz, voided_by uuid, void_reason text,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid,
  exclude using gist (chair_id with =, period with &&) where (voided_at is null),
  check (lower(period) < upper(period)),
  check ((voided_at is null) = (void_reason is null))
);                                           -- rls: tenant_location; append_only: no (korekta przez unieważnienie); retention: 5 lat
create index on chair_occupancy (tenant_id, location_id, lower(period));
create index on chair_occupancy (tenant_id, provider_id, lower(period));
create index on chair_occupancy (tenant_id, chair_id, lower(period)) where voided_at is null;

create table occupancy_day_closures (       -- zamknięcie dnia: wpisy dnia w gabinecie są kompletne
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  day date not null,
  closed_at timestamptz not null default now(), closed_by uuid not null,
  summary jsonb not null,                                -- { hours, amount_grosze, chairs_without_entries: [] }
  reopened_at timestamptz, reopened_by uuid, reopen_reason text,
  unique (location_id, day)
);                                           -- rls: tenant_location; append_only: no; retention: 5 lat
```

Ustawienie `scheduling.occupancy_mode` (`platform.settings`, per gabinet): `manual` (1.0) albo `appointments` (po przejściu gabinetu na terminarz Crux w 1.1). Zasilanie `analytics` czyta wpisy ręczne dla trybu `manual` i wizyty dla trybu `appointments` (`12`). Wpis nie ma żadnej kolumny o pacjencie i nie dostanie jej: identyfikacja pacjenta należy do `appointments` (1.1).

### 5.2 Grafiki, wizyty, lista oczekujących — F1 (1.1)

```sql
create type appointment_status as enum ('scheduled','confirmed','arrived','in_chair','completed','cancelled','no_show');
create type booking_source as enum ('reception','phone','online','znanylekarz','recall','transfer');

create table provider_schedules (           -- grafik: reguła cykliczna + zakres obowiązywania
  id uuid primary key, tenant_id uuid not null, location_id uuid not null references locations,
  staff_id uuid not null references staff_members, chair_id uuid references chairs,
  weekday smallint not null check (weekday between 1 and 7),
  starts time not null, ends time not null, check (starts < ends),
  valid_from date not null, valid_to date,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid
);

create table appointments (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  patient_id uuid references patients,       -- null tylko dla wizyt technicznych (zabronione w UI poza blokadą)
  chair_id uuid not null references chairs,
  provider_id uuid not null references staff_members,
  assistant_id uuid references staff_members,
  period tstzrange not null,                 -- [start, end)
  primary_category text not null,            -- 'Z1'…'Z+' → kolor bloku
  status appointment_status not null default 'scheduled',
  source booking_source not null default 'reception',
  reception_note text,                       -- bez danych medycznych
  confirmed_at timestamptz, confirmed_via text,        -- sms|phone|online
  arrived_at timestamptz, in_chair_at timestamptz, completed_at timestamptz,
  cancelled_at timestamptz, cancelled_by uuid, cancel_reason text, late_cancellation boolean not null default false,
  no_show_at timestamptz,
  override_reason text,                      -- gdy poza grafikiem/godzinami (kierownik)
  external_ref text,                         -- id w ZnanyLekarz
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid,
  exclude using gist (chair_id with =, period with &&) where (status not in ('cancelled','no_show')),
  exclude using gist (provider_id with =, period with &&) where (status not in ('cancelled','no_show')),
  check (lower(period) < upper(period))
);
create index on appointments (tenant_id, location_id, lower(period));
create index on appointments (tenant_id, patient_id, lower(period));
create index on appointments (tenant_id, provider_id, lower(period));

create table appointment_services (
  appointment_id uuid not null references appointments, service_id uuid not null,
  position smallint not null, primary key (appointment_id, service_id)
);

create table waitlist_entries (
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  service_ids uuid[] not null, preferred_location_ids uuid[] not null default '{}',
  preferred_provider_id uuid, earliest date not null, latest date,
  preferred_weekdays smallint[] default '{}', preferred_time_from time, preferred_time_to time,
  note text, status text not null default 'open',     -- open|offered|booked|closed
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz
);
```

F1-002 dodaje też FK `chair_occupancy.appointment_id → appointments` (expand) i projekcję: dla gabinetu w trybie `appointments` każda wizyta w statusie innym niż `cancelled`/`no_show` ma wiersz pochodny w `chair_occupancy` (`source = appointment`), utrzymywany przez przypadki użycia terminarza, żeby historia obłożenia z 1.0 i 1.1 była jedną tabelą.

Status `cancelled`/`no_show` zwalnia fotel dzięki warunkowi `where` w więzach wykluczających. Przesunięcie wizyty = `update period` (audytowane); zmiana gabinetu = nowy rekord `transfer` + anulowanie starego z `cancel_reason = 'transferred'` (żeby historia była czytelna).

## 6. Komunikacja (`messaging`) — F1

```sql
create type message_channel as enum ('sms','email');
create type message_status as enum ('queued','sent','delivered','failed','replied','cancelled');

create table message_templates (
  id uuid primary key, tenant_id uuid not null, key text not null,          -- 'appointment.reminder.48h'
  channel message_channel not null, locale text not null default 'pl',
  body text not null, variables text[] not null, version int not null default 1,
  active boolean not null default true, created_at timestamptz not null default now(), created_by uuid,
  unique (tenant_id, key, channel, locale, version)
);

create table messages (                     -- append_only (status aktualizuje worker przez rolę crux_worker)
  id uuid primary key, tenant_id uuid not null, location_id uuid,
  patient_id uuid references patients, appointment_id uuid references appointments,
  channel message_channel not null, template_key text, purpose text not null,   -- reminder|confirmation|recall|marketing|transactional
  recipient_hmac bytea not null,            -- tylko skrót numeru/adresu
  body_hash bytea not null,                 -- skrót treści (treść nie jest przechowywana w tej tabeli)
  status message_status not null default 'queued',
  provider_message_id text, scheduled_for timestamptz, sent_at timestamptz, delivered_at timestamptz,
  reply_text text, replied_at timestamptz, error_code text,
  created_at timestamptz not null default now()
);

create table channel_consents (             -- zgody marketingowe; append_only + revoked_at
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  channel message_channel not null, purpose text not null default 'marketing',
  consent_text text not null, granted_at timestamptz not null, granted_via text not null,  -- paper|tablet|sms|online
  revoked_at timestamptz, revoked_via text, created_by uuid
);
```

## 7. Katalog i cennik (`catalog`) — F2

```sql
create table service_categories (code text primary key, name text not null, color_bg text not null, color_edge text not null, position int not null);
-- seed: Z1…Z+ z 06-design-system.md

create table services (
  id uuid primary key, tenant_id uuid not null,
  code text not null, name text not null, category text not null references service_categories,
  default_duration_min int not null, buffer_after_min int not null default 0,
  requires_capability text,                 -- kategoria kompetencji wykonawcy
  requires_equipment text[] not null default '{}',
  default_icd9 text,                        -- ref.icd9_pl
  tooth_scope text not null default 'tooth',   -- tooth|surface|quadrant|arch|mouth|none
  recall_interval_months int,
  online_bookable_new_patients boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid,
  unique (tenant_id, code)
);

create table price_lists (                  -- wersje cennika bazowego tenanta
  id uuid primary key, tenant_id uuid not null, name text not null,
  valid_from date not null, valid_to date, status text not null default 'draft',  -- draft|active|archived
  created_at timestamptz not null default now(), created_by uuid, activated_at timestamptz, activated_by uuid
);
create table price_list_items (
  price_list_id uuid not null references price_lists, service_id uuid not null references services,
  price_min bigint not null, price_max bigint,          -- grosze; widełki dopuszczalne
  primary key (price_list_id, service_id)
);
create table price_overrides (              -- wyjątek per gabinet
  id uuid primary key, tenant_id uuid not null, location_id uuid not null, price_list_id uuid not null,
  service_id uuid not null, price_min bigint not null, price_max bigint, reason text not null,
  unique (price_list_id, location_id, service_id)
);
```

Cena obowiązująca = `price_overrides` dla gabinetu, inaczej `price_list_items` z aktywnego cennika na dzień świadczenia. Funkcja domenowa `priceFor(serviceId, locationId, onDate)`.

## 8. Plany leczenia (`planning`) — F2

```sql
create type plan_status as enum ('draft','presented','accepted','declined','expired','in_progress','completed');
create type plan_item_status as enum ('planned','scheduled','done','dropped');

create table treatment_plans (
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  author_id uuid not null references staff_members, location_id uuid not null,   -- gabinet przedstawienia
  title text not null, status plan_status not null default 'draft',
  presented_at timestamptz, accepted_variant_id uuid, accepted_at timestamptz, declined_at timestamptz, decline_reason text,
  valid_until date, completed_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid
);
create table plan_variants (
  id uuid primary key, tenant_id uuid not null, plan_id uuid not null references treatment_plans,
  label text not null, position int not null, note_for_patient text
);
create table plan_stages (
  id uuid primary key, tenant_id uuid not null, variant_id uuid not null references plan_variants,
  position int not null, title text not null
);
create table plan_items (
  id uuid primary key, tenant_id uuid not null, stage_id uuid not null references plan_stages,
  service_id uuid not null references services, tooth smallint, surfaces text[] not null default '{}',
  list_price bigint not null, discount bigint not null default 0, final_price bigint not null,
  status plan_item_status not null default 'planned', position int not null,
  check (final_price = list_price - discount)
);
create table estimates (                    -- append_only: wersja kosztorysu przedstawiona pacjentowi
  id uuid primary key, tenant_id uuid not null, plan_id uuid not null, variant_id uuid not null,
  snapshot jsonb not null, total bigint not null, pdf_file_id uuid not null, content_hash bytea not null,
  presented_at timestamptz not null, presented_by uuid not null
);
create table plan_acceptances (             -- append_only
  id uuid primary key, tenant_id uuid not null, plan_id uuid not null, estimate_id uuid not null references estimates,
  accepted_at timestamptz not null, method text not null,       -- tablet_signature|paper_scan|online
  signature_file_id uuid, signer text not null,                 -- patient|guardian|both
  created_by uuid not null
);
```

## 9. Finanse (`billing`) — F2

```sql
create type payment_method as enum ('cash','card','transfer','installments','voucher','other');

create table charges (                      -- append_only; korekta przez reversal
  id uuid primary key, tenant_id uuid not null, location_id uuid not null,
  patient_id uuid not null references patients, appointment_id uuid references appointments,
  procedure_id uuid, plan_item_id uuid references plan_items, service_id uuid not null references services,
  provider_id uuid not null references staff_members,
  amount bigint not null, discount bigint not null default 0, final_amount bigint not null,
  reverses_id uuid references charges, reason text,
  charged_at timestamptz not null, created_at timestamptz not null default now(), created_by uuid not null,
  check (final_amount = amount - discount)
);
create table payments (                     -- append_only
  id uuid primary key, tenant_id uuid not null, location_id uuid not null,
  patient_id uuid not null references patients, amount bigint not null, method payment_method not null,
  received_at timestamptz not null, received_by uuid not null,
  receipt_number text, terminal_ref text, reverses_id uuid references payments, reason text,
  created_at timestamptz not null default now()
);
create table allocations (                  -- append_only
  id uuid primary key, tenant_id uuid not null, payment_id uuid not null references payments,
  charge_id uuid not null references charges, amount bigint not null, created_at timestamptz not null default now()
);
create table invoice_requests (             -- dane do faktury wystawianej w Optimie
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null, buyer jsonb not null,
  charge_ids uuid[] not null, status text not null default 'pending',  -- pending|exported|issued|cancelled
  external_number text, exported_at timestamptz, created_at timestamptz not null default now(), created_by uuid
);
create table provider_contracts (
  id uuid primary key, tenant_id uuid not null, staff_id uuid not null references staff_members,
  valid_from date not null, valid_to date,
  basis text not null,                      -- performed|collected
  rate_percent numeric(5,2) not null, lab_cost_share_percent numeric(5,2) not null default 0,
  material_cost_share_percent numeric(5,2) not null default 0, minimum_monthly bigint,
  rules jsonb,                              -- wyjątki per kategoria usługi
  created_at timestamptz not null default now(), created_by uuid
);
create table provider_settlements (         -- append_only po zatwierdzeniu
  id uuid primary key, tenant_id uuid not null, staff_id uuid not null, period_month date not null,
  contract_id uuid not null references provider_contracts,
  revenue_base bigint not null, rate_percent numeric(5,2) not null, gross_fee bigint not null,
  lab_deduction bigint not null default 0, material_deduction bigint not null default 0, adjustments bigint not null default 0,
  net_fee bigint not null, status text not null default 'draft',   -- draft|approved|corrected
  approved_at timestamptz, approved_by uuid, corrects_id uuid references provider_settlements,
  lines jsonb not null,                     -- pozycje (charge_id, kwota, udział)
  created_at timestamptz not null default now(), created_by uuid
);
```

## 10. Laboratorium (`lab`) — spec F0-001, realizacja w wydaniu 1.1 (po `patients`)

```sql
create type lab_order_status as enum ('sent','received','fitted','completed','cancelled');
create table dental_labs (id uuid primary key, tenant_id uuid not null, name text not null, contact jsonb, nip text, active boolean not null default true, created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid);
create table lab_orders (
  id uuid primary key, tenant_id uuid not null,
  location_id uuid not null references locations,          -- gabinet wysyłki
  patient_id uuid not null references patients, lab_id uuid not null references dental_labs,
  provider_id uuid not null references staff_members,
  work_type text not null, teeth smallint[] not null, shade text, description text,
  sent_at timestamptz not null, due_at timestamptz not null, received_at timestamptz, fitted_at timestamptz, completed_at timestamptz,
  cost bigint, status lab_order_status not null default 'sent',
  return_appointment_id uuid,                              -- wizyta oddania (może być w innym gabinecie); FK do appointments dodawany w F1 (expand)
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid
);
```

Zmiana `cost` po `received` wymaga `reason` (trigger wymusza obecność `crux.reason`, patrz spec F0-001, AC4). `lab_orders.patient_id` wymaga pełnej tabeli `patients` z F1-001, dlatego moduł powstaje w wydaniu 1.1 (prompt `F1`, K12), po kartotece i terminarzu; FK `return_appointment_id → appointments` dodawany w tej samej migracji.

## 11. CRM (`crm`) — F3

```sql
create table recall_rules (id uuid primary key, tenant_id uuid not null, service_id uuid not null references services, interval_months int not null, label text not null, active boolean not null default true);
create table recall_tasks (
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null references patients,
  rule_id uuid not null references recall_rules, source_appointment_id uuid references appointments,
  due_on date not null, home_location_id uuid, status text not null default 'open',   -- open|contacted|booked|declined|expired
  booked_appointment_id uuid references appointments, closed_at timestamptz, close_reason text,
  created_at timestamptz not null default now(), unique (patient_id, rule_id, due_on)
);
create table recall_contacts (              -- append_only: próby kontaktu
  id uuid primary key, tenant_id uuid not null, task_id uuid not null references recall_tasks,
  channel text not null, outcome text not null,   -- no_answer|callback|booked|declined|sms_sent
  note text, contacted_at timestamptz not null default now(), contacted_by uuid
);
create table campaigns (id uuid primary key, tenant_id uuid not null, name text not null, channel message_channel not null, template_key text not null, audience jsonb not null, scheduled_for timestamptz, status text not null default 'draft', stats jsonb, created_at timestamptz not null default now(), created_by uuid);
```

## 12. Analityka (`analytics`) — od 1.0 (ADR-027)

### 12.1 Wydanie 1.0 (F0-011)

```sql
create table analytics.dim_date (date_key date primary key, iso_week int not null, iso_year int not null, month int not null, quarter int not null, year int not null, weekday smallint not null, is_holiday boolean not null, is_working_day boolean not null);
create table analytics.dim_location (location_key uuid primary key, tenant_id uuid not null, number text not null, name text not null, color_key text not null, active boolean not null);
create table analytics.dim_chair (chair_key uuid primary key, tenant_id uuid not null, location_key uuid not null, name text not null, position int not null, active boolean not null);
create table analytics.dim_provider (provider_key uuid primary key, tenant_id uuid not null, display_name text not null, title text, role text not null);   -- dane pracownicze; bez kontaktu
create table analytics.dim_category (category_key text primary key, name text not null, position int not null);                                                 -- Z1…Z+

create table analytics.fact_chair_capacity (  -- fotel × dzień
  tenant_id uuid not null, location_id uuid not null, chair_key uuid not null, date_key date not null,
  open_minutes int not null,                   -- z opening_hours i opening_exceptions
  blocked_minutes int not null,                -- z time_blocks (fotel)
  available_minutes int not null,              -- open − blocked
  refreshed_at timestamptz not null,
  primary key (chair_key, date_key)
);
create table analytics.fact_chair_occupancy ( -- fotel × dzień × wykonawca × kategoria
  tenant_id uuid not null, location_id uuid not null, chair_key uuid not null, date_key date not null,
  provider_key uuid, category_key text not null,
  occupied_minutes int not null, amount_grosze bigint not null default 0, entries int not null,
  source occupancy_source not null,            -- manual (1.0) | appointment (1.1)
  refreshed_at timestamptz not null,
  primary key (chair_key, date_key, provider_key, category_key, source)
);
create table analytics.fact_day_closures (tenant_id uuid not null, location_id uuid not null, date_key date not null, closed boolean not null, closed_at timestamptz, refreshed_at timestamptz not null, primary key (location_id, date_key));
create table analytics.refresh_log (id uuid primary key, window_from timestamptz not null, window_to timestamptz not null, started_at timestamptz not null, finished_at timestamptz, rows_written int, mode text not null);  -- mode: incremental | full
```

`fact_chair_occupancy.provider_key` jest `NOT NULL` (wymóg klucza głównego): wpis bez wykonawcy dostaje wartownika `00000000-0000-7000-8000-000000000000`. `source` ma typ `scheduling.occupancy_source`. Indeksy `(tenant_id, location_id, date_key)` na faktach. RLS `tenant_location` + poziom uprawnień `analytics.view_*` (wykonawca widzi tylko własne wiersze obłożenia); widoki `v_self_occupancy` (`provider_key = auth.staff_id()`), `v_location_*`, `v_network_*`. Zasilanie: worker `analytics.refresh` co 5 min (gabinet i dzień ze zdarzeń `occupancy.*` oraz ostatnie 48 h) i pełne 02:10 (13 miesięcy); źródło per gabinet wg `scheduling.occupancy_mode`. Metryki 1.0: `11`, sekcja 4.7.

### 12.2 Od 2.1 (F3-002)

Wymiary: `dim_date` (dzień, tydzień ISO, miesiąc, kwartał, dzień tygodnia, święto), `dim_location` (id, number, name, color_key), `dim_provider` (id, display_name, role, bez danych kontaktowych), `dim_service` (id, code, name, category), `dim_patient_anon` (surrogate key, rok urodzenia, płeć, gabinet macierzysty, źródło, pierwsza wizyta; **bez nazwiska, PESEL, kontaktu**).

Fakty (ziarno w nawiasie): `fact_appointments` (wizyta), `fact_chair_capacity` (z 1.0; od 1.1 `available_minutes` uwzględnia też grafiki wykonawców dla `provider_utilization`), `fact_procedures` (procedura; do F4 pozycja rozliczenia wizyty), `fact_charges` (należność), `fact_payments` (płatność/alokacja), `fact_plan_items` (pozycja planu z datami: przedstawiona, zaakceptowana, wykonana), `fact_recall_tasks` (zadanie), `fact_lab_orders` (zlecenie), `fact_messages` (wiadomość: typ, status).

Każda tabela faktów: `tenant_id`, `location_id`, klucze wymiarów, miary w groszach/minutach, `refreshed_at`. RLS: `tenant_location` + widoki per rola (`v_provider_self` filtruje `provider_id = auth.staff_id()`). Tabela `analytics.refresh_log` (okno, czas, liczba wierszy). Metryki: `11-dashboardy-i-raporty.md`.

## 13. Dokumentacja kliniczna (`clinical`) — F4 (zarys)

```sql
create type entry_type as enum ('history','examination','diagnosis','procedure_note','recommendation','imaging_report','attachment_note','referral','prescription');

create table encounters (id uuid primary key, tenant_id uuid not null, location_id uuid not null, patient_id uuid not null, appointment_id uuid references appointments, provider_id uuid not null, started_at timestamptz not null, closed_at timestamptz, status text not null default 'open', p1_status text, created_at timestamptz not null default now(), created_by uuid);
create table clinical_entries (id uuid primary key, tenant_id uuid not null, patient_id uuid not null, encounter_id uuid not null references encounters, type entry_type not null, current_version_id uuid, created_at timestamptz not null default now(), created_by uuid);
create table entry_versions (               -- append_only; odebrane update/delete
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null, entry_id uuid not null references clinical_entries,
  version int not null, content jsonb not null, content_text text not null,
  occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
  author_id uuid not null, signed_by uuid, signed_at timestamptz,
  prev_hash bytea, content_hash bytea not null, correction_reason text,
  unique (entry_id, version)
);
create table diagnoses (id uuid primary key, tenant_id uuid not null, patient_id uuid not null, encounter_id uuid not null, entry_version_id uuid not null, icd10 text not null references ref.icd10, tooth smallint, surfaces text[], description text, status text not null default 'active', created_at timestamptz not null default now());
create table procedures (id uuid primary key, tenant_id uuid not null, location_id uuid not null, patient_id uuid not null, encounter_id uuid not null, entry_version_id uuid not null, service_id uuid not null, icd9 text references ref.icd9_pl, tooth smallint, surfaces text[], material text, provider_id uuid not null, plan_item_id uuid, performed_at timestamptz not null, created_at timestamptz not null default now());
create table consent_templates (id uuid primary key, tenant_id uuid not null, key text not null, title text not null, body text not null, version int not null, active boolean not null default true, created_at timestamptz not null default now(), created_by uuid);
create table consents (                     -- append_only
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null, encounter_id uuid, template_id uuid not null references consent_templates,
  signed_at timestamptz not null, signer text not null, signature_file_id uuid, pdf_file_id uuid not null, content_hash bytea not null, prev_hash bytea, revoked_at timestamptz, created_by uuid not null
);
create table attachments (id uuid primary key, tenant_id uuid not null, patient_id uuid not null, encounter_id uuid, entry_version_id uuid, file_id uuid not null, kind text not null, description text, created_at timestamptz not null default now(), created_by uuid);
create table disclosures (                  -- rejestr udostępnień; append_only
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null, recipient text not null, basis text not null, scope text not null, form text not null, disclosed_at timestamptz not null, disclosed_by uuid not null, file_id uuid
);
create table edm_documents (                -- dokument CDA + status w P1; append_only + status workera
  id uuid primary key, tenant_id uuid not null, patient_id uuid not null, entry_version_id uuid not null, kind text not null,
  cda_file_id uuid not null, cda_hash bytea not null, signature_kind text, signed_at timestamptz,
  p1_status text not null default 'pending', p1_document_id text, p1_error text, created_at timestamptz not null default now()
);
create table medical_event_reports (id uuid primary key, tenant_id uuid not null, encounter_id uuid not null, bundle_file_id uuid, p1_status text not null default 'pending', p1_event_id text, p1_error text, attempts int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz);
```

Pliki (`files`): wspólna tabela `files` (id, tenant_id, patient_id, bucket, object_key, mime, size, sha256, created_at, created_by, `retention_until`) — metadane plików z magazynu obiektowego (ADR-026).

## 14. Obrazowanie (`imaging`) — F5 (zarys)

```sql
create table devices (id uuid primary key, tenant_id uuid not null, location_id uuid not null, name text not null, kind text not null, token_hash bytea not null, last_seen_at timestamptz, capabilities text[] not null default '{}', active boolean not null default true, created_at timestamptz not null default now(), created_by uuid);
create table imaging_studies (id uuid primary key, tenant_id uuid not null, location_id uuid not null, patient_id uuid not null, study_instance_uid text not null unique, orthanc_id text not null, modality text not null, study_at timestamptz not null, description text, series_count int, instance_count int, teeth smallint[], thumbnail_file_id uuid, report_entry_id uuid, backup_status text not null default 'pending', created_at timestamptz not null default now());
create table scan_files (id uuid primary key, tenant_id uuid not null, location_id uuid not null, patient_id uuid not null, file_id uuid not null, scanner text, format text not null, captured_at timestamptz, arch text, note text, created_at timestamptz not null default now(), created_by uuid);
```

## 14a. Tabele pomocnicze (platforma, integracje, łączniki)

Tabele, do których odwołują się specyfikacje i prompty, a które nie należą do żadnego agregatu domenowego. Każda z `tenant_id` (poza słownikami) i RLS wg wzorca.

```sql
create table patient_counters (tenant_id uuid primary key, last_number int not null default 0);        -- F1-001; select … for update
create table appointment_plan_items (                                                                 -- F2-002; łącznik wizyta ↔ pozycja planu
  appointment_id uuid not null references appointments, plan_item_id uuid not null references plan_items,
  tenant_id uuid not null, primary key (appointment_id, plan_item_id)
);
create table entry_templates (id uuid primary key, tenant_id uuid not null, key text not null, entry_type entry_type not null, service_id uuid, title text not null, content_schema jsonb not null, defaults jsonb, version int not null default 1, active boolean not null default true, created_at timestamptz not null default now(), created_by uuid);  -- F4-004

create table platform.legacy_refs (tenant_id uuid not null, entity text not null, legacy_id text not null, crux_id uuid not null, imported_at timestamptz not null default now(), primary key (tenant_id, entity, legacy_id));  -- F1-006
create table platform.rate_limits (key text not null, window_start timestamptz not null, count int not null default 0, primary key (key, window_start));  -- F1-007; bez tenant_id (publiczne wejścia)
create table platform.alerts (id uuid primary key, tenant_id uuid not null, location_id uuid, kind text not null, value numeric, threshold numeric, link text, raised_at timestamptz not null default now(), resolved_at timestamptz);  -- F3-008
create table platform.integration_log (id uuid primary key default extensions.uuid_generate_v7(), tenant_id uuid, port text not null, operation text not null, status text not null, duration_ms int, ref_id uuid, error_code text, occurred_at timestamptz not null default now());  -- 05, sekcja 7; bez danych osobowych
create table platform.bridge_commands (id uuid primary key, tenant_id uuid not null, device_id uuid not null references devices, kind text not null, payload jsonb not null, status text not null default 'queued', result jsonb, created_at timestamptz not null default now(), created_by uuid, completed_at timestamptz);  -- F5-001; payload tylko identyfikatory i dane niezbędne (patient_number, nazwisko do DxStart)
```

`platform.bridge_commands.payload` jest wyjątkiem od zasady „tylko identyfikatory”, bo `DxStart.exe` wymaga nazwiska i daty urodzenia; wiersze są czyszczone po 24 h, a dostęp do nich ma tylko rola workera i urządzenie.

## 15. Retencja i usuwanie

| Dane | Okres | Mechanizm |
|---|---|---|
| dokumentacja (encounters, entries, consents, edm_documents, files kliniczne) | 20 lat od końca roku ostatniego wpisu pacjenta | `retention_until` liczone triggerem; usuwanie tylko przez procedurę workera z protokołem w `audit.events` |
| obrazy w Orthanc | jak dokumentacja (traktujemy jako część dokumentacji) | polityka Orthanc + kopia w magazynie |
| finanse | 5 lat podatkowo, ale nie krócej niż dokumentacja powiązana | jak wyżej |
| logi dostępu | 5 lat (minimum rozsądne; EHDS wymaga „odpowiedniego” okresu) **[do potwierdzenia]** | partycje miesięczne |
| wiadomości, outbox | 13 miesięcy | partycje, czyszczenie workerem |
| wpisy obłożenia, zamknięcia dni, blokady | 5 lat (dane operacyjne i finansowe pomocnicze; nie dokumentacja) | czyszczenie workerem z protokołem |
| prompty AI z danymi pacjenta | 30 dni | ADR-024 |
