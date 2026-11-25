# 5 · Dostępy: kto co widzi i skąd system to wie

## 5.1 Trzy pojęcia

- **Rola** (`staff_role`): `network_admin` (zarząd), `location_manager` (kierownik gabinetu), `receptionist` (recepcja), `dentist` i `hygienist` (wykonawcy), `assistant` (asystentka), `accountant` (księgowość), `auditor` (audytor). Rola jest przypisana do osoby **w gabinecie**.
- **Członkostwo** (`memberships`): osoba × gabinet × rola × okres (`starts_on`, `ends_on`). Lekarz pracujący w 01 i 02 ma dwa członkostwa. Odejście z pracy to `ends_on`; rekord zostaje.
- **Uprawnienie** (`permissions`): konkretna czynność, np. `occupancy.write`, `analytics.view_network`. Macierz rola → uprawnienia jest danymi w bazie (`role_permissions`), seedowana w K06 z tabeli w `docs/03`, sekcja 8. Kod pyta o uprawnienie („czy ma `occupancy.write_own`?”); rola jest tylko zestawem uprawnień.

## 5.2 Macierz 1.0

Zakres: `sieć` = wszystkie gabinety tenanta; `gabinet` = gabinety z członkostwem; `własne` = tylko rekordy, w których wykonawcą jest użytkownik.

| Uprawnienie | zarząd | kierownik | recepcja | lekarz / higienistka | asystentka | księgowość | audytor |
|---|---|---|---|---|---|---|---|
| `org.manage` (gabinety, fotele, godziny) | sieć | — | — | — | — | — | — |
| `staff.manage` (konta, role, członkostwa) | sieć | — | — | — | — | — | — |
| `settings.manage` (flagi, ustawienia, cele) | sieć | — | — | — | — | — | — |
| `audit.read` | sieć | gabinet | — | — | — | — | sieć |
| `occupancy.read` | sieć | gabinet | gabinet | gabinet | gabinet | sieć | sieć |
| `occupancy.write` | sieć | gabinet | gabinet | — | — | — | — |
| `occupancy.write_own` | — | — | — | własne | — | — | — |
| `occupancy.void` | sieć | gabinet | gabinet (dzień otwarty) | własne | — | — | — |
| `occupancy.close_day` | sieć | gabinet | gabinet | — | — | — | — |
| `occupancy.write_closed` (po zamknięciu, z powodem) | sieć | gabinet | — | — | — | — | — |
| `occupancy.override_hours` (poza godzinami, z powodem) | sieć | gabinet | — | — | — | — | — |
| `analytics.view_self` | — | — | — | własne | — | — | — |
| `analytics.view_location` | — | gabinet | — | — | — | — | — |
| `analytics.view_network` | sieć | — | — | — | — | sieć | — |
| `analytics.export` (CSV) | sieć | gabinet | — | — | — | sieć | — |
| `network.view` (przełącznik „cała sieć”) | sieć | — | — | — | — | sieć | sieć |
| `integrations.manage` | sieć | — | — | — | — | — | — |

Zasady: zarząd nie dostaje uprawnień „własne” (jeśli wspólnik leczy, ma drugie członkostwo jako `dentist`); konta `accountant` i `auditor` powstają, gdy są potrzebne (w 1.0 nie); każde nowe uprawnienie to wiersz w `docs/03`, sekcja 8, plus `permissions.ts`, plus migracja danych, w jednym PR.

## 5.3 Przykłady na osobach z danych testowych

- **Kasia Nowak, recepcja 01:** widzi i wpisuje obłożenie 01, zamyka dzień 01. Nie widzi 02 (RLS: brak członkostwa). Nie widzi pulpitu (brak `analytics.view_*`); jedyna „analityka”, jaką ma, to pasek sum pod siatką dnia (ekran operacyjny).
- **lek. dent. Piotr Kos, członkostwa w 01 i 02:** w przełączniku ma oba gabinety; wpisuje tylko własne godziny (`provider_id = ja`); pulpit „moje” liczy jego godziny z obu gabinetów; mediana gabinetu bez nazwisk.
- **Ewa Mróz, kierownik 02:** pulpit gabinetu dla 02, tabela wykonawców 02, poprawki po zamknięciu dnia z powodem; na `/pulpit` (sieć) dostaje przekierowanie do `/pulpit/gabinet`; parametr `gabinet=01` w URL jest ignorowany po stronie serwera (AC3 w F0-011).
- **Miłosz, zarząd:** wszystko we wszystkich gabinetach; w przełączniku „01 + 02 · cała sieć”; eksport CSV zostawia ślad w `audit.events`.

## 5.4 Jak system to wie: od logowania do polityki w bazie

{{rysunek:rls}}

1. Logowanie przez Supabase Auth: hasło + kod TOTP (MFA, `aal2`). Pierwsze logowanie wymusza zmianę hasła jednorazowego i rejestrację TOTP.
2. `requireActor()` czyta sesję z ciasteczka, weryfikuje JWT i buduje **claims** z członkostw: `{ staffId, tenantId, locationIds, activeLocationId, role, permissions[] }`; aktywny gabinet pochodzi z ciasteczka `crux.location` (przełącznik w pasku bocznym).
3. Każdy przypadek użycia woła `authorize(actor, 'occupancy.write', { locationId })`: brak uprawnienia lub członkostwa → `forbidden` + wpis w audycie.
4. `withActor(actor, tx => …)` otwiera transakcję, ustawia `set local role authenticated` i `request.jwt.claims`, więc polityki RLS w bazie widzą tego samego aktora. Zapytanie bez `where` nadal nie odda cudzych danych.
5. Worker działa jako `crux_worker` z listą dozwolonych operacji (`privileged.ts`); każda operacja ma nazwę i audyt.

## 5.5 Sesja, blokada, konta

- sesja 12 h; blokada ekranu po 5 minutach bezczynności (stanowiska wspólne), odblokowanie hasłem lub kodem bez utraty stanu strony;
- konta imienne; hasło jednorazowe pokazywane raz przy zaproszeniu i przekazywane osobiście; nigdy e-mailem ani na czacie;
- dezaktywacja: `deactivateStaffMember` kończy członkostwa (`ends_on`), wylogowuje, zostawia historię;
- reset MFA tylko przez zarząd z powodem (audyt);
- w 1.0 nie ma SSO (Entra ID dochodzi w 2.1) i nie ma logowania pacjentów (portal w 5.0).

## 5.6 Co się dzieje, gdy ktoś spróbuje obejść

| Próba | Co ją zatrzymuje |
|---|---|
| recepcja 01 wpisuje w URL `gabinet=02` | serwer ignoruje parametr spoza członkostw; RLS nie zwraca wierszy 02 |
| prompt generuje zapytanie bez `where location_id` | RLS; test pgTAP dla każdej tabeli |
| kod próbuje użyć `service_role` albo `security definer` | `crux-doctor` (`code.no-service-role`, `code.no-security-definer`) i przegląd PR |
| ktoś chce „na chwilę” wyłączyć RLS na tabeli | `db.rls-required` czerwone w CI; `AGENTS.md` zabrania |
| lekarz wpisuje godziny za kolegę | `occupancy.write_own` wymaga `provider_id = auth.staff_id()` (polityka i domena) |
| ktoś wpisuje nazwisko pacjenta w notatce | `containsPii` odrzuca telefony, PESEL i e-maile; pole ma 80 znaków; reguła w `AGENTS.md` nie pozwala dodać pola o pacjencie |
