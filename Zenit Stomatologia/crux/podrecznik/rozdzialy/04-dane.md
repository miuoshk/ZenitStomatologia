# 4 · Dane: jak wygląda baza wydania 1.0

Źródło na poziomie DDL: `docs/03a-schemat-bazy.md` (sekcje 0–3, 5.1, 12.1, 14a). Słownik i niezmienniki: `docs/03-model-domeny.md`. Tu jest mapa i wyjaśnienie, dlaczego tak.

## 4.1 Mapa encji 1.0

{{rysunek:er-1-0}}

Trzy schematy operacyjne (`public` z tabelami modułów, `platform`, `audit`), schemat `analytics` (fakty i wymiary), `ref` (słowniki, w 1.0 tylko kategorie Z1–Z+), `pgboss` (kolejka workera). Dane pacjentów nie istnieją; pierwszą tabelę `patients` tworzy dopiero wydanie 1.1 i jest to migracja z etykietą `patient-data`.

## 4.2 Tabele 1.0 w jednym miejscu

| Schemat.tabela | Co trzyma | Kto pisze | Wzorzec RLS | Tylko dopisywanie |
|---|---|---|---|---|
| `tenants` | podmiot leczniczy (administrator danych), DEK w KMS | zarząd (K17 bootstrap) | `tenant_all` (własny) | nie |
| `locations` | gabinety `01`, `02` z numerem, nazwą, kodem resortowym, `color_key` | `org.manage` | `tenant_all` | nie |
| `chairs` | fotele gabinetu: nazwa, kolejność, wyposażenie, `active` | `org.manage` | `tenant_all` | nie |
| `opening_hours`, `opening_exceptions` | tygodniowy wzorzec godzin i wyjątki (święta, dni skrócone) | `org.manage` | `tenant_all` | nie |
| `staff_members` | personel: imię, nazwisko, tytuł, NPWZ, e-mail, `auth_user_id` | `staff.manage` | `tenant_all` (własny rekord: ograniczone kolumny) | nie |
| `memberships` | przypisanie osoby do gabinetu z rolą i okresem | `staff.manage` | `tenant_all` | nie (koniec = `ends_on`) |
| `permissions`, `role_permissions` | uprawnienia jako dane i macierz ról | migracja danych (K06) | `ref_read` | tak |
| `provider_capabilities` | kategorie usług, które wykonawca może wykonywać | `staff.manage` | `tenant_all` | nie |
| `break_glass_requests` | dostęp awaryjny (używany od 1.1) | lekarz, kierownik | `tenant_all` + `audit.read` | tak |
| `chair_occupancy` | **wpis obłożenia**: fotel × godzina, wykonawca, kategoria, kwota, źródło, unieważnienie | `occupancy.write`, `occupancy.write_own` | `tenant_location` | nie, ale bez `delete` (unieważnianie) |
| `occupancy_day_closures` | zamknięcie dnia w gabinecie z podsumowaniem | `occupancy.close_day` | `tenant_location` | nie (ponowne otwarcie z powodem) |
| `time_blocks` | blokady foteli (serwis, zamknięcie, szkolenie); od 1.1 także wykonawców | `occupancy.write` | `tenant_location` | nie (`ended_at`) |
| `platform.outbox`, `command_log` | zdarzenia do wysłania; idempotencja komend | kod | tenant | tak |
| `platform.feature_flags`, `settings` | flagi per tenant/gabinet; ustawienia z rejestru kluczy (`scheduling.occupancy_mode`, `analytics.targets.*`) | `settings.manage` | tenant | nie |
| `audit.events` | kto, co, kiedy, przed/po (bez pól wrażliwych), powód | trigger `audit.track()` | `audit.read` | tak |
| `audit.access_log` | odczyty danych pacjenta (od 1.1; mechanizm testowany w 1.0) | funkcja `audit.log_access()` | `audit.read` | tak |
| `audit.integrity_checks` | wyniki weryfikacji łańcuchów (od 3.0; worker od 1.0 pisze „brak danych”) | worker | `audit.read` | tak |
| `analytics.dim_*`, `fact_chair_capacity`, `fact_chair_occupancy`, `fact_day_closures`, `refresh_log` | wymiary i fakty 1.0 (rozdział 7) | worker `analytics.refresh` | `tenant_location` + widoki per rola | przeliczane |

Wzorce RLS (`docs/03a`, sekcja 0): `tenant_all` (widoczne dla całego tenanta), `tenant_location` (tylko gabinety z członkostwem, chyba że `network.view`), `append_only` (bez `update`/`delete` dla `authenticated`), `self_or_manager` (własne wiersze lub kierownik), `ref_read` (słowniki tylko do odczytu).

## 4.3 Wpis obłożenia: tabela, która przeżyje wszystkie wydania

```sql
create table chair_occupancy (
  id uuid primary key default extensions.uuid_generate_v7(),
  tenant_id uuid not null, location_id uuid not null references locations,
  chair_id uuid not null references chairs,
  provider_id uuid references staff_members,            -- kto pracował; null = nieprzypisany
  period tstzrange not null,                             -- [start, end); 1.0: pełne godziny lokalne
  category text not null,                                -- 'Z1'…'Z+'
  amount_grosze bigint check (amount_grosze >= 0),       -- przychód przypisany do wpisu; null = nie wpisano
  source occupancy_source not null default 'manual',     -- manual | appointment | import
  appointment_id uuid,                                   -- od 1.1 (FK dodany w F1-002)
  override_reason text,                                  -- gdy poza godzinami otwarcia (kierownik)
  note text check (char_length(note) <= 80),             -- organizacyjna; containsPii w domenie
  voided_at timestamptz, voided_by uuid, void_reason text,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz, updated_by uuid,
  exclude using gist (chair_id with =, period with &&) where (voided_at is null),
  check (lower(period) < upper(period)),
  check ((voided_at is null) = (void_reason is null))
);
```

Dlaczego tak, element po elemencie:

- **`period tstzrange`** (pełny zakres czasu): baza umie sprawdzić nakładanie zakresów (`&&`) i w 1.1 wpisy pochodne z wizyt mają prawdziwy czas (10:15–10:45), a definicja metryki się nie zmienia. W 1.0 pełne godziny wymusza interfejs; baza dopuszcza minuty.
- **więz wykluczający** `exclude using gist (chair_id with =, period with &&) where (voided_at is null)`: dwa nieunieważnione wpisy nie mogą nachodzić na ten sam fotel. Działa niezależnie od kodu: nawet błędny prompt nie stworzy duplikatu (AC2 w F0-010).
- **`amount_grosze bigint`**: pieniądze w groszach jako liczba całkowita, typ `Money` w kodzie; nigdy `number` z przecinkiem (ADR-007). `null` znaczy „nie wpisano”, co jest inną informacją niż `0`.
- **`source`**: w 1.0 zawsze `manual`; od 1.1 wizyty tworzą wiersze `appointment`; import historii da `import`. Analityka liczy wszystkie, ale pokazuje odsetek ręcznych.
- **`voided_at` + `void_reason`**: nic nie znika, każda korekta ma powód (zasada „nic nie znika” z `docs/00`), a `check` pilnuje, że unieważnienie zawsze ma powód.
- **brak jakiejkolwiek kolumny o pacjencie** i reguła w `AGENTS.md`, że jej nie będzie: identyfikacja pacjenta należy do `appointments` (1.1).

## 4.4 Pojemność, blokady, zamknięcie dnia

- **Pojemność fotela** na dzień = godziny otwarcia gabinetu (tygodniowy wzorzec `opening_hours` z wyjątkami `opening_exceptions`) minus blokady fotela (`time_blocks` z `chair_id`). To mianownik obłożenia; liczy go worker do `fact_chair_capacity`.
- **Blokada** (`time_blocks`): serwis, zamknięcie, szkolenie, inne; w 1.1 także urlop i przerwa wykonawcy (`staff_id`). Wpis obłożenia w czasie blokady jest odrzucany przez domenę (AC8).
- **Zamknięcie dnia** (`occupancy_day_closures`): jeden wiersz na gabinet i dzień, z podsumowaniem (`summary jsonb`: godziny, kwota, fotele bez wpisów). Po zamknięciu zwykła edycja jest zablokowana; `reopened_at` z powodem otwiera ponownie. Odsetek zamkniętych dni to metryka jakości danych (`days_closed_rate`).

## 4.5 Ustawienia jako dane: tryb obłożenia

`platform.settings` z rejestrem kluczy (`settings/keys.ts`). Klucz `scheduling.occupancy_mode` per gabinet: `manual` (1.0) albo `appointments` (po przejściu gabinetu na terminarz w 1.1). Zasilanie analityki czyta wpisy ręczne dla `manual`, a wizyty dla `appointments`; domena odrzuca wpisy ręczne dla dni po przełączeniu (AC11). Dzięki temu przełączenie gabinetu to zmiana jednego ustawienia i da się je zrobić dla 01 i 02 w różnych dniach.

## 4.6 Identyfikatory, czas, pieniądze (konwencje, które obowiązują wszędzie)

- identyfikatory: UUIDv7 (`extensions.uuid_generate_v7()`), typ `Id` w kodzie; posortowane w czasie, więc indeksy są tanie;
- czas: `timestamptz` w UTC; prezentacja w `Europe/Warsaw` przez `@crux/shared/time`; nigdy `new Date()` poza `packages/shared/src/time.ts`; `hourRange(day, hour)` zwraca pełną godzinę lokalną z poprawną obsługą zmiany czasu (test dla 2027-03-28);
- pieniądze: grosze `bigint`, `Money.format()` → `1 234,50 zł`, `Money.formatShort()` → `412 tys. zł`;
- każda tabela: `id`, `tenant_id`, `created_at`, `created_by`, komentarz `rls:/append_only:/retention:`, RLS, trigger audytu, test pgTAP (`AGENTS.md`, zasada 4);
- migracje: `drizzle-kit generate` → przegląd → `pnpm db:test` → staging → produkcja; zawsze expand → migrate → contract; migracje na `main` tylko się dokłada.

## 4.7 Audyt: co zapisuje się samo

Trigger `audit.track()` na każdej tabeli modułów zapisuje `before`/`after` jako JSON (z usunięciem pól `*_enc`, których w 1.0 nie ma, ale reguła już działa), autora, `request_id` i powód z `current_setting('crux.reason')`. Zmiana kosztu, unieważnienie wpisu, edycja po zamknięciu dnia i nadpisanie godzin wymagają powodu na poziomie domeny i trafiają do audytu razem z nim. `audit.events` czyta tylko `audit.read` (zarząd, audytor, kierownik dla swojego gabinetu).

## 4.8 Retencja

Wpisy obłożenia, zamknięcia dni i blokady: 5 lat (dane operacyjne); czyszczenie workerem z protokołem. Logi audytu: 5 lat **[do potwierdzenia]**. Outbox: 13 miesięcy. Pełna tabela: `docs/03a`, sekcja 15.
