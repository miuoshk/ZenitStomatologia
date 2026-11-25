# F1 · Pacjenci i terminarz = wydanie 1.1 „Ratania”: prompty K01–K12

Wymaga ukończonego wydania 1.0 (bramka z `docs/07`, sekcja 2) **i** toru B: opinia prawna, DPIA, umowy powierzenia, bo od K01 w systemie są dane pacjentów (ADR-032). Specyfikacje: `docs/specs/F1-001`, `F1-002`, `F1-003`, `F0-001` (napisane), pozostałe z backlogu `docs/13` (napisz z szablonu w czacie projektu przed promptem). Każdy prompt: Plan → Agent → ledger → commit. Moduł wzorcowy do kopiowania: `@crux/scheduling` (obłożenie, 1.0) i `docs/wzorzec-modulu.md`.

---

### K01 · `@crux/patients`: kartoteka (F1-001)  [security]

**Cel.** Pełna kartoteka pacjenta sieci z szyfrowaniem, duplikatami, opiekunami, upoważnieniami i logiem dostępu.

**Przeczytaj.** `@docs/specs/F1-001-kartoteka-pacjenta.md`, `@docs/03a-schemat-bazy.md` (sekcja 4), `@docs/03-model-domeny.md` (Patient), `@docs/02` (ADR-025, 032), `@docs/wzorzec-modulu.md`, `@packages/modules/scheduling` (wzorzec z 1.0).

**Część 1/4 · migracja.** `pnpm gen module patients`. Utwórz `patients` w całości z `03a`, sekcja 4 (pierwsza tabela z danymi pacjentów w systemie: migracja ma etykietę `patient-data` i wymaga potwierdzenia toru B w opisie PR), z kolumnami szyfrowanymi, HMAC, kontaktem, adresem, preferencjami, `home_location_id`, `acquisition_*`, `flags`, `merged_into_id`, `search`; indeksy (GIN tsvector, trigram, telefon, duplikaty), unikalność `pesel_hmac`; tabele `guardians`, `patient_authorizations` (append-only z `revoked_at`), `patient_merges` (append-only), `patient_counters` (licznik numerów per tenant z `select … for update`); widok `patients_resolved` (rozwiązuje `merged_into_id`). RLS `tenant_all`; trigger audytu z usuwaniem `*_enc`. pgTAP: izolacja, brak `update`/`delete` na append-only, audyt bez PESEL.

**Część 2/4 · domena.** `Patient.create` (walidacja PESEL przez `@crux/shared/pesel`, spójność daty urodzenia i płci, E.164, małoletni → wymagany opiekun do zgód jako reguła `requiresGuardianForConsent(patient, now)`), `nextPatientNumber(counter)` → `ZS-000123`, `findSimilar(candidates)` (punktacja: nazwisko trigram + data urodzenia + telefon), reguły scalania (nie scalaj dwóch rekordów z różnymi PESEL-ami; scalany nie może mieć `merged_into_id`). Testy jednostkowe.

**Część 3/4 · przypadki użycia.** `createPatient` (szyfruje PESEL i dokument, liczy HMAC, numer karty w transakcji, zwraca listę podobnych, jeśli nie podano `confirmNotDuplicate`), `updatePatient` (dane kontaktowe i adres; zmiana PESEL tylko z uprawnieniem `patient.identity` i powodem), `addGuardian`, `grantAuthorization`, `revokeAuthorization`, `mergePatients` (uprawnienie `patient.merge`, powód, przepina referencje przez aktualizację `patient_id` w tabelach z listy w module, zapisuje `patient_merges`), zapytania: `searchPatients(query)` (po nazwisku, numerze karty, telefonie, PESEL przez HMAC; p95 < 300 ms na 50 tys. rekordów — test wydajności na zestawie wzorcowym), `getPatientCard(id)` → **loguje dostęp** (`logAccess`, zasób `patient_record`), `listRecentPatients`. Testy integracyjne dla AC1–AC7 specyfikacji.

**Część 4/4 · UI i e2e.** `/pacjenci` (lista z wyszukiwaniem, `DataTable`, filtry: gabinet macierzysty, flagi), `/pacjenci/nowy` (formularz z `PeselInput` auto-wypełniającym datę i płeć, wykrywanie duplikatów jako panel „Podobni pacjenci” z przyciskiem „To ten pacjent” / „Załóż nowego”), `/pacjenci/[id]` (karta: nagłówek z numerem i chipem gabinetu macierzystego, zakładki: Dane, Opiekunowie i upoważnienia, Wizyty (od K03), Historia dostępu (dla `audit.read`)), `PatientSearch` jako źródło wyników w `CommandPalette` z 1.0 (`Ctrl+K`, wyniki z klawiatury, Enter otwiera kartę). e2e: założenie z duplikatem, scalanie, otwarcie karty zapisuje log dostępu (sprawdzane przez zapytanie testowe).

**Ograniczenia.** PESEL nigdy w URL, logach, nazwach plików; w UI maskowany (`85****1234`) poza polem edycji. Eksport CSV listy pacjentów tylko z uprawnieniem `patient.export` i wpisem w logu dostępu.

**Sprawdzenie.** pełny zestaw + `spec.traceability` dla F1-001.

---

### K02 · `@crux/scheduling`: grafiki, blokady, wizyty (dane)  [security]

**Cel.** Model danych terminarza z więzami, które uniemożliwiają podwójne rezerwacje.

**Przeczytaj.** `@docs/specs/F1-002-terminarz-sieci.md`, `@docs/03a` (sekcja 5: 5.1 istnieje od 1.0, 5.2 teraz), `@docs/03` (Appointment, ChairOccupancy, grafik, blokada), `@docs/02` (ADR-007, 032).

**Krok 0 · katalog minimalny.** `pnpm gen module catalog`: migracja `service_categories` (seed Z1…Z+ z kolorami z `docs/06`) i `services` z kolumnami potrzebnymi terminarzowi (`code`, `name`, `category`, `default_duration_min`, `buffer_after_min`, `requires_capability`, `requires_equipment`, `online_bookable_new_patients`, `active`; reszta z `03a` sekcja 7 dochodzi w F2-K01 jako expand), RLS `tenant_all`, seed startowy ~40 usług bez cen (`ref.service_templates`), zapytanie `servicesForBooking(ids)`. pgTAP.

**Kroki.** Moduł `scheduling` istnieje od 1.0 (obłożenie); rozszerzasz go (expand). Migracja: enumy, `provider_schedules`, `appointments` (z dwoma więzami `EXCLUDE USING gist` i warunkiem statusów), `appointment_services`, `waitlist_entries` (szkielet; logika w K05), FK `chair_occupancy.appointment_id → appointments`, użycie `time_blocks.staff_id` dla urlopów i przerw wykonawców. Projekcja obłożenia: dla gabinetu w trybie `scheduling.occupancy_mode = appointments` każda wizyta w statusie innym niż `cancelled`/`no_show` utrzymuje wiersz pochodny w `chair_occupancy` (`source = appointment`, `appointment_id`, kategoria z `primary_category`, bez kwoty) przez przypadki użycia z K03 (nie trigger: reguły domeny zostają w kodzie); wpisy ręczne dla dni po dacie przełączenia są odrzucane (F0-010, AC11). RLS `tenant_location` dla `appointments`, `provider_schedules`; `waitlist_entries` `tenant_all` (lista sieci). Trigger audytu. Funkcja SQL `scheduling.free_slots(tenant, location_ids[], provider_id, duration_min, from, to, step_min)` zwracająca sloty z grafików minus wizyty i blokady (`generate_series` + `tstzrange` arytmetyka; wydajność: < 100 ms dla 4 gabinetów i 14 dni, test na zestawie wzorcowym). pgTAP: dwie wizyty na tym samym fotelu w nachodzącym czasie → `23P01`; anulowana nie blokuje; wykonawca nie może być w dwóch gabinetach naraz; recepcja 01 nie widzi wizyt 02 bez `network.view`.

**Zatrzymaj się, gdy.** `EXCLUDE` z warunkiem `where` nie jest wspierany przez Drizzle (migracja `manual_`).

---

### K03 · `@crux/scheduling`: domena i przypadki użycia  [money-adjacent]

**Przeczytaj.** jak K02 + `@docs/01` (sekcja 8: terminarz sieci, najbliższy wolny termin), `@docs/09` (sekcja 3: wzorzec `bookAppointment`).

**Kroki.**
1. Domena: `Appointment.draft`, przejścia statusów (diagram z `03`), reguły: w godzinach pracy gabinetu (z wyjątkami), w grafiku wykonawcy, kompetencje (`provider_capabilities` vs kategorie usług), wyposażenie fotela vs `services.requires_equipment`, `late_cancellation` (< 24 h), `overrideReason` dla `appointment.override_hours`; `SlotSearch` (sortowanie wyników `free_slots` po czasie, odległość gabinetu od macierzystego, preferencje). Testy jednostkowe z `FixedClock`, w tym przejście czasu letniego.
2. Przypadki użycia: `bookAppointment`, `moveAppointment` (zmiana czasu/fotela/wykonawcy w tym samym gabinecie; audyt), `transferAppointment` (do innego gabinetu: nowy rekord `source = transfer`, stary `cancelled` z `cancel_reason = transferred`, zdarzenie `appointment.transferred.v1`), `cancelAppointment` (powód, `late_cancellation`), `setAppointmentStatus` (`confirmed`, `arrived`, `in_chair`, `completed`, `no_show`; zdarzenia `appointment.completed.v1`, `appointment.no_show.v1`), `createTimeBlock`, `setProviderSchedule` (z walidacją nakładania), zapytania: `listDaySchedule(locationIds, day)` (kolumny foteli z wizytami, blokadami, grafikami; jeden SQL), `listWeekSchedule`, `findFreeSlots(criteria)`, `listPatientAppointments`. Każda komenda: `commandId`, `authorize`, outbox. Testy integracyjne dla AC1–AC10 z F1-002.
3. Konsumenci zdarzeń w workerze: `appointment.booked.v1` i `appointment.moved.v1` → planowanie przypomnień (K07 doda adapter; teraz tworzą wiersze `messages` ze statusem `queued`).

**Ograniczenia.** Status zmienia się tylko przez `setAppointmentStatus` (jedna maszyna stanów). Nigdy `update status` z UI bezpośrednio.

---

### K04 · `ScheduleGrid`: spike i implementacja (ADR-019)  [ui]

**Przeczytaj.** `@docs/02` (ADR-019), `@docs/06` (sekcja 3: wskaźnik „teraz”, kolornik; sekcja 4: `ScheduleGrid`), `@design/crux-dashboard-prototyp.html` (sekcja Dziś), `@docs/specs/F1-002` (UI).

**Część 1/3 · spike (3 dni, osobna gałąź `spike/schedule-grid`).** Dwie wersje widoku dnia dla 5 foteli z 2 gabinetów na danych z fabryk: (A) własna siatka: CSS grid, bloki pozycjonowane absolutnie, `dnd-kit` do przeciągania i zmiany długości, wirtualizacja wierszy czasu; (B) FullCalendar Scheduler (licencja komercyjna; tylko do oceny). Kryteria: czas renderu 60 wizyt < 50 ms, przeciągnięcie z podglądem kolizji, klawiatura (strzałki po blokach, Enter otwiera, `M` przenieś), iPad (dotyk 44 px), zgodność z tokenami bez nadpisywania CSS biblioteki. Raport w `docs/spikes/schedule-grid.md`; decyzja → aktualizacja ADR-019. Domyślnie wygrywa (A), jeśli spełnia kryteria.

**Część 2/3 · komponent.** `packages/ui/src/schedule-grid/`: `ScheduleGrid` (props: kolumny foteli z chipami gabinetów, zakres godzin, krok 15 min, bloki: wizyty/blokady/grafik, `now`), `AppointmentBlock` (kolor kolornika, pasek krawędzi, nazwisko skrócone, kategoria, status ikoną i słowem przy ≥ 45 min), `NowIndicator` (bursztyn), interakcje: klik → `onSelect`, przeciągnięcie → `onMove(draft)` z walidacją po stronie serwera i cofnięciem przy błędzie, zmiana długości, `Ctrl` + przeciągnięcie między kolumnami różnych gabinetów → `onTransfer`. Storybook: dzień, tydzień, iPad, ciemny, 2 gabinety × 3 fotele, stany ładowania.

**Część 3/3 · ekrany.** `/terminarz` (dzień/tydzień; filtr gabinetów: mój/wszystkie/wybrane; wykonawcy; przełączanie dni `←/→`, `T` dziś; panel boczny wizyty z akcjami statusów, SMS, przeniesienie; dialog nowej wizyty z `PatientSearch`, usługami (sumuje czas), „najbliższy wolny termin w sieci” jako lista slotów z gabinetem i odległością; nadpisanie godzin z powodem dla kierownika), `/terminarz/grafiki` (grafiki wykonawców tygodniowo z wyjątkami, blokady). e2e: umówienie, kolizja z komunikatem, przesunięcie, przeniesienie między gabinetami z SMS w kolejce, klawiatura.

**Ograniczenia.** Zero logiki domenowej w komponencie (walidacje po stronie serwera; komponent tylko „proponuje”). Żadnych kolorów poza tokenami.

---

### K05 · Lista oczekujących (F1-004)

**Przeczytaj.** spec F1-004 (napisz z szablonu), `@docs/03a` (sekcja 5 `waitlist_entries`), `@docs/01` (sekcja 8).

**Kroki.** Domena: dopasowanie wpisu do slotu (usługi, gabinety preferowane, dni, godziny, wykonawca). Przypadki użycia: `addToWaitlist`, `offerSlot` (status `offered`, SMS z propozycją przez `messages`; w F1 propozycja telefoniczna, SMS z linkiem w F2), `bookFromWaitlist`, `closeWaitlistEntry`; zapytanie `matchWaitlistForGap(locationId, chairId, period)` używane po anulowaniu wizyty (zdarzenie `appointment.cancelled.v1` → worker → lista propozycji na ekranie Dziś). UI: zakładka „Lista oczekujących” w `/terminarz`, panel w Dziś „Luka 10:30–11:15, fotel 2: 3 pacjentów z listy”. Testy AC.

---

### K06 · Ekran Dziś (F1-005)

**Przeczytaj.** spec F1-005, `@docs/11` (sekcja 5.1), `@design/crux-dashboard-prototyp.html` (widok Dziś).

**Kroki.** `/dzis`: nagłówek, 4 kafle na żywo (z tabel operacyjnych), `ScheduleGrid` dnia w trybie kompaktowym, prawa kolumna: luki z listą oczekujących (K05), prace lab na dziś/jutro (`lab_order.at_risk.v1` i zapytanie), niepotwierdzone wizyty jutro z przyciskiem „zadzwoń” (otwiera panel z numerem i notatką), pacjenci z saldem (od F2: placeholder ukryty flagą `billing`). Skróty `N`, `T`, `←/→`. Odświeżanie co 30 s bez migania (`refresh()` z interwałem, pauza gdy karta nieaktywna). e2e: statusy przy fotelu z klawiatury.

---

### K07 · `@crux/messaging`: SMS, przypomnienia, potwierdzenia (F1-003)  [security]

**Przeczytaj.** `@docs/specs/F1-003-przypomnienia-sms.md`, `@docs/03a` (sekcja 6), `@docs/05` (sekcja 3), `@docs/04` (sekcja 2: PKE; sekcja 7: zgody).

**Część 1/3 · dane i port.** `pnpm gen module messaging`. Migracja `message_templates`, `messages`, `channel_consents` (z `03a`; `messages` append-only poza statusem aktualizowanym przez `crux_worker` z polityką ograniczoną do kolumn statusu przez widok lub funkcję `messaging.update_status` `security definer` z listą w `privileged.ts`). Port `SmsSender` (`send(to, body, { ref })` → `providerMessageId`; `parseInboundWebhook(req)` → `{ from, text, providerMessageId }`; `parseStatusWebhook`). Atrapa `fakeSms`. Adapter dostawcy (SMSAPI lub inny z DPA) z testem kontraktowym na nagranych odpowiedziach. pgTAP + testy portu.

**Część 2/3 · logika.** Szablony startowe (seed, PL, ton Pan/Pani): `appointment.reminder.48h` („Dzień dobry, przypominamy o wizycie w zenit.stomatologia, gabinet 01 Nowodworska, 14 lutego o 10:30. Prosimy o potwierdzenie odpowiedzią TAK. Jeśli nie może Pan/Pani przyjść, prosimy o odpowiedź NIE lub telefon …”), `appointment.reminder.2h`, `appointment.moved`, `appointment.transferred`, `waitlist.offer`. Worker: `reminders.schedule` co 10 min tworzy `messages` (`queued`, `scheduled_for`) dla wizyt 48 h/2 h z `dedupe_key`; `messages.send` wysyła w oknie 8:00–20:00 (poza oknem przesuwa `scheduled_for`), pomija, jeśli wizyta anulowana/przesunięta po utworzeniu wiadomości (porównanie `appointments.updated_at`); webhook odpowiedzi (route handler `/api/webhooks/sms` z weryfikacją podpisu dostawcy): „TAK” → `setAppointmentStatus(confirmed, via sms)`, „NIE” → zadanie dla recepcji (zdarzenie `appointment.decline_requested.v1` → panel Dziś), „STOP” → `revokeConsent(marketing)` + nigdy marketing; każda inna odpowiedź → skrzynka „Odpowiedzi SMS” w `/integracje`. Testy integracyjne AC1–AC8.

**Część 3/3 · UI.** W panelu wizyty: historia wiadomości (status doręczenia ikoną + słowem), przycisk „Wyślij przypomnienie teraz”, „Wyślij własny SMS” (z szablonu `custom`, limit 2 na dobę na pacjenta, tylko transakcyjne). `/ustawienia/szablony` (edycja z podglądem zmiennych, wersjonowanie). Karta pacjenta: zgody kanałowe (marketing) z treścią i datą; przypomnienia nie wymagają zgody, ale pacjent może wybrać `preferred_channel = phone`/`none` (wtedy zadanie dla recepcji zamiast SMS).

**Ograniczenia.** Treść SMS nie zawiera rozpoznań, usług klinicznych ani kwot (tylko: gabinet, data, godzina, prośba). Test na szablonach: zabronione zmienne `{service}`, `{diagnosis}`, `{amount}` w szablonach przypomnień.

---

### K08 · Import z obecnego programu (F1-006)  [security]

**Przeczytaj.** spec F1-006 (po analizie eksportu z F0), `@docs/05` (sekcja 6), `@docs/03a` (sekcje 4–5).

**Kroki.** `apps/worker/src/migration/<program>/`: parser eksportu (format z F0), mapowanie na `createPatient`/`bookAppointment` przez przypadki użycia (nie `insert` bezpośrednio, żeby walidacje i audyt zadziałały), `platform.legacy_refs` (tenant, encja, `legacy_id`, `crux_id`), raport `migration-report.json` (zaimportowane, odrzucone z powodem, duplikaty z punktacją), tryb `--dry-run`, idempotencja (ponowne uruchomienie nie dubluje), anonimizator do stagingu (`--anonymize`: nazwiska i PESEL-e zastąpione syntetycznymi z zachowaniem struktury). Test na syntetycznym eksporcie (fabryka tworzy plik w formacie źródłowym).

**Zatrzymaj się, gdy.** Eksport zawiera dokumentację medyczną: w F1 **nie importujemy** jej (ADR-013); zapisz pola do F4-009.

---

### K09 · Rezerwacja online (F1-007)  [security]

**Przeczytaj.** spec F1-007, `@docs/05` (sekcja 4), `@docs/06` (ton Pan/Pani).

**Kroki.** `apps/web/app/(public)/rezerwacja`: krok 1 wybór usługi (tylko `online_bookable_new_patients`; w F1 katalog minimalny: 2 usługi Z1/Z2 w `services` seed), krok 2 gabinet lub „najbliższy w sieci” → sloty z `findFreeSlots` (publiczne zapytanie przez dedykowany przypadek użycia z aktorem systemowym `public_booking` o uprawnieniu `appointment.create_online` i RLS przez rolę `crux_public` z dostępem tylko do funkcji `scheduling.free_slots_public`), krok 3 dane (imię, nazwisko, telefon, e-mail, zgoda na przetwarzanie w celu rezerwacji), krok 4 kod SMS (6 cyfr, 10 min, 3 próby), potwierdzenie. Tworzy pacjenta „do weryfikacji” (flaga `unverified`) lub dopasowuje po telefonie + nazwisku, wizytę `scheduled` ze `source = online`. Ochrona: limit prób per IP i telefon (tabela `platform.rate_limits`), honeypot, Turnstile/hCaptcha po 3 nieudanych. Strona w stylu marki (jasny kierunek „Kość”, rycina szałwii), teksty na Ty (strona), potwierdzenie Pan/Pani (SMS). e2e pełnej ścieżki z `fakeSms`.

**Ograniczenia.** Publiczna część nie importuje niczego poza dedykowanym przypadkiem użycia; brak dostępu do danych innych pacjentów (test: zapytanie o sloty nie ujawnia, kto jest umówiony).

---

### K10 · Synchronizacja ZnanyLekarz (F1-008; realizuj po przyznaniu dostępu do API)

**Przeczytaj.** spec F1-008, `@docs/05` (sekcje 1, 4), dokumentacja Docplanner Integrations (link w `05`).

**Kroki.** Port `BookingChannel`; adapter `docplanner`: mapowanie kalendarzy (wykonawca × gabinet) i usług (`platform.settings` klucz `docplanner.mappings`), publikacja dostępności (push po zmianach terminarza przez outbox z `dedupe_key` per kalendarz × dzień), odbiór rezerwacji (webhook lub pull wg możliwości API) → `bookAppointment` ze `source = znanylekarz` i `external_ref`, anulowania w obie strony, pacjent dopasowany/utworzony jako `unverified`. Test kontraktowy na nagraniach z sandboxa. Ekran `/integracje/znanylekarz`: mapowania, ostatnie synchronizacje, konflikty do rozstrzygnięcia (wizyta z ZnanyLekarz na zajęty slot → `waitlist_entries` + zadanie recepcji).

---

### K11 · PWA tylko do odczytu i ekran Integracje (F1-009, F1-010)

**Kroki.** (a) `next-pwa`-równoważna konfiguracja lub własny service worker: cache listy dnia (`/dzis` dane z ostatnich 24 h) i karty pacjentów z dnia (imię, nazwisko, telefon; bez PESEL i adresu), baner „Tryb awaryjny: tylko odczyt, dane z HH:MM”, blokada zapisu; cache szyfrowany kluczem sesji w IndexedDB i czyszczony przy wylogowaniu; test e2e z symulacją offline. (b) `/integracje`: lista integracji z portów (status z `integration_log` ostatnich 24 h, liczba `dead`, przycisk „ponów”, filtr tematów), skrzynka odpowiedzi SMS, log ostatnich 100 wywołań bez danych osobowych. Uprawnienie `integrations.manage`.

---

### K12 · Zlecenia laboratoryjne (F0-001), wykonaj po K01 i K03  [clinical-adjacent, money]

**Cel.** Lista zleceń do pracowni w każdym gabinecie z terminem, kosztem, statusem i alertem; moduł skopiowany ze wzorca obłożenia.

**Przeczytaj.** `@docs/specs/F0-001-zlecenia-laboratoryjne.md`, `@docs/03a-schemat-bazy.md` (sekcja 10), `@docs/03-model-domeny.md` (LabOrder), `@docs/wzorzec-modulu.md`, `@docs/09` (sekcja 3).

**Część 1/4 · migracja i RLS.** `pnpm gen module lab`. Migracja `dental_labs`, `lab_orders` (FK `patient_id → patients`, `return_appointment_id → appointments`), enum `lab_order_status`, trigger audytu, trigger wymuszający `crux.reason` przy zmianie `cost` po `received` (AC4). RLS `tenant_location` dla `lab_orders` (gabinet wysyłki), `tenant_all` dla `dental_labs`. pgTAP: AC3 (tenant B nie widzi), recepcja 01 nie widzi zleceń 02, zmiana kosztu bez powodu rzuca. Sprawdzenie: `pnpm db:test`.

**Część 2/4 · domena.** `domain/lab-order.ts`: typ, `LabOrder.create(input, clock)` z walidacją zębów FDI bez duplikatów (AC5), przejścia statusów (`sent → received → fitted → completed`, `cancelled` z każdego poza `completed`), `isLate(order, now)`; `domain/teeth.ts` współdzielone później (przenieś do `@crux/shared/dental`, jeśli to pierwsze użycie; zapisz w ledger). Testy jednostkowe z `FixedClock`.

**Część 3/4 · przypadki użycia.** `createLabOrder`, `markReceived`, `markFitted`, `completeLabOrder`, `cancelLabOrder`, `updateLabOrderCost` (wymaga `reason`, uprawnienie `lab_order.cost`), zapytania `listLabOrders(filters)` (status, pracownia, lekarz, spóźnione, gabinet), `listLabsForTenant`. Każdy: Zod, `commandId`, `authorize`, `withActor`, zdarzenia `lab_order.created.v1`, `lab_order.received.v1`. Testy integracyjne: AC1, AC2, AC4; `receptionist` tylko czyta.

**Część 4/4 · UI i e2e.** `pnpm gen screen laboratorium`. Ekran `/laboratorium`: `DataTable` z filtrami (`SegmentedControl` status, `Select` pracownia i lekarz, `ChipToggle` „spóźnione”), `LocationChip` w wierszach, `StatusPill` z ikoną i tekstem „spóźnione” (AC2), `SidePanel` dodawania (pacjent przez `PatientSearch`; zęby jako lista chipów FDI; `ConfirmDialog` z powodem przy zmianie kosztu), `EmptyState` z ryciną mięty. Teksty i18n. e2e: dodanie zlecenia, oznaczenie spóźnionego, zmiana kosztu z powodem; test, że użytkownik bez `lab_order.cost` nie widzi akcji i server action odrzuca.

**Po części 4.** Zadanie cykliczne workera `lab.alerts.daily` 7:00: zlecenia `sent` z wizytą jutro → zdarzenie `lab_order.at_risk.v1` (konsument: ekran Dziś, K06). `packages/modules/lab/README.md`.

**Sprawdzenie.** pełny zestaw + `spec.traceability` dla F0-001.

**Zatrzymaj się, gdy.** Spec wymaga pola, którego nie ma w `03a` (najpierw PR do `03a`).

---

### Po 1.1: bramka

Zgodnie z `docs/07`: 4 tygodnie pracy obu gabinetów, zero podwójnych rezerwacji (zapytanie kontrolne na `appointments` z nachodzącymi okresami na fotelu zwraca 0), p95 wyszukiwania < 300 ms (pomiar z OTel), ankieta recepcji, potwierdzenia SMS > 60%, oba gabinety przełączone na `occupancy_mode = appointments` z ciągłą historią obłożenia na pulpicie. Wpis `1.1 · bramka` w ledger.
