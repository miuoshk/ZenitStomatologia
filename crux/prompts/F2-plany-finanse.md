# F2 · Katalog, plany leczenia, finanse: prompty K01–K08

Wymaga ukończonego F1. Specyfikacje: F2-002 napisana; pozostałe z backlogu (napisz przed promptem). Etykieta `money` oznacza obowiązkowy przegląd adwersarialny i przegląd człowieka.

---

### K01 · `@crux/catalog`: usługi, kategorie, cennik wersjonowany (F2-001)  [money]

**Przeczytaj.** spec F2-001, `@docs/03a` (sekcja 7), `@docs/03` (sekcja 4: kolornik), `@docs/06` (kolornik), `@docs/01` (sekcja 8: jeden standard usług).

**Kroki.**
1. Moduł `catalog` istnieje od F1 (krok 0 w `F1#K02`). Migracja expand: brakujące kolumny `services` z `03a` sekcja 7 (`default_icd9`, `tooth_scope`, `recall_interval_months`), nowe tabele `price_lists`, `price_list_items`, `price_overrides`. RLS `tenant_all`; edycja `catalog.manage`. pgTAP.
2. Domena: `priceFor(service, location, onDate, { priceLists, overrides })` (wyjątek gabinetu → aktywny cennik na dzień; brak ceny → błąd `price_missing`), reguły aktywacji cennika (jeden aktywny na dzień, `valid_from` w przyszłości lub dziś, poprzedni dostaje `valid_to`), walidacja usługi (czas > 0, kategoria z listy, kod unikalny). Testy jednostkowe: nachodzące cenniki, cennik na dzień przejścia.
3. Przypadki użycia: `createService`, `updateService` (zmiany czasu/kategorii nie wpływają na istniejące wizyty), `archiveService`, `createPriceList` (z kopią poprzedniego), `setPrice`, `setPriceOverride` (z powodem), `activatePriceList`, zapytania `listServices`, `getPrice`, `comparePriceLists`. Zdarzenie `price_list.activated.v1`.
4. UI: `/ustawienia/uslugi` (tabela z kolorami kategorii, czasami, wymaganiami), `/ustawienia/cennik` (wersje, porównanie z poprzednią, wyjątki per gabinet z powodem, aktywacja z datą). Seed startowy z `ref.service_templates` (ok. 40 usług wg kolornika; ceny puste do uzupełnienia).

**Ograniczenia.** Ceny w groszach (`Money`). Zmiana ceny nigdy nie modyfikuje istniejących `plan_items`/`charges` (test).

---

### K02 · `@crux/planning`: plan leczenia z wariantami i kosztorysem (F2-002)  [money, clinical-adjacent]

**Przeczytaj.** `@docs/specs/F2-002-plan-leczenia.md`, `@docs/03a` (sekcja 8), `@docs/03` (TreatmentPlan), `@docs/02` (ADR-008, 026), `@docs/06` (ton dla pacjenta).

**Część 1/4 · dane.** `pnpm gen module planning`. Migracja: `treatment_plans`, `plan_variants`, `plan_stages`, `plan_items` (z `check final_price = list_price - discount`), `estimates` i `plan_acceptances` (append-only), `files` (wspólna tabela metadanych plików, jeśli nie istnieje; port `FileStoragePort` z K08 tej fazy — jeśli K08 jeszcze nie wykonany, użyj adaptera lokalnego z K09-F0 i zamień w K08). RLS `tenant_all`. pgTAP: `estimates` bez update/delete.

**Część 2/4 · domena.** Maszyna stanów planu, reguły: pozycje tylko z aktywnych usług, cena z `priceFor` w dniu utworzenia pozycji (zapisana jako `list_price`), rabat ≤ cena, `present` wymaga ≥ 1 wariantu z ≥ 1 pozycją, `accept` zamraża ceny (od tej chwili `list_price`/`final_price` niezmienne; test), `expire` po `valid_until`, `complete` gdy wszystkie pozycje `done`/`dropped`. Kalkulacja sum per etap/wariant z `Money.allocate` dla rabatu procentowego. Testy jednostkowe.

**Część 3/4 · przypadki użycia.** `createPlan`, `addVariant`, `addStage`, `addItem`, `updateItem` (tylko `draft`), `presentPlan` (generuje `estimates` dla każdego wariantu: snapshot JSON + PDF + hash; PDF w szacie marki **zenit.stomatologia** (pacjent nigdy nie widzi marki Crux, `docs/06`, 3.2): nagłówek `zenit-poziomy-zielen.svg` 12 mm, numer gabinetu „01 Nowodworska”, kolornik przy pozycjach, suma w formacie `1 234,50 zł`, ważność, podpis lekarza; szablon `EstimatePdf` w `packages/ui/src/documents/`, generator PDF w workerze z szablonu React → PDF lub `@react-pdf/renderer`, bez danych w URL), `acceptPlan` (wariant, metoda; zapis `plan_acceptances` z `estimate_id`; zdarzenie `plan.accepted.v1`), `declinePlan`, `markItemScheduled` (po umówieniu wizyty z pozycjami planu: `appointment_services` ↔ `plan_items` przez tabelę łączącą `appointment_plan_items`), `markItemDone` (w F2 ręcznie przy rozliczeniu wizyty; od F4 z procedury), zapytania `getPlan`, `listPlansForPatient`, `listOpenPlans(filters)`. Testy AC1–AC9.

**Część 4/4 · UI.** `/pacjenci/[id]/plany` i `/plany/[id]`: edytor planu (warianty jako zakładki, etapy, pozycje z wyszukiwarką usług, ząb przez mini-odontogram do wyboru (komponent `ToothPicker` w `packages/ui`, tylko wybór zębów), rabat kwotowy/procentowy, suma na żywo), „Przedstaw pacjentowi” (podgląd PDF, wysyłka linku SMS z kodem), widok akceptacji na iPadzie (K03), lista `/plany` (filtry: status, lekarz, gabinet, wartość). e2e: utworzenie z 2 wariantami, przedstawienie, PDF ma sumę zgodną z pozycjami.

---

### K03 · Akceptacja planu na tablecie (F2-003)  [security]

**Kroki.** `SignaturePad` w `packages/ui` (canvas, eksport PNG, 44 px, wymazanie), tryb kiosku `/akceptacja/[token]` (token jednorazowy generowany przez `presentPlan`, ważny 30 min, bez nawigacji aplikacji): pacjent widzi kosztorys wariantu, zaznacza oświadczenia, podpisuje; `acceptPlan({ method: 'tablet_signature' })` zapisuje PNG podpisu w `files`, dokleja do PDF kosztorysu stronę z podpisem, liczy `content_hash` (łańcuch w `plan_acceptances`), log dostępu. Małoletni: wymagane podpisy opiekuna (i pacjenta ≥ 16 lat) — formularz pokazuje dwa pola. e2e na viewport iPad.

---

### K04 · `@crux/billing`: rozliczenie wizyty, płatności, saldo, storna (F2-004)  [money]

**Przeczytaj.** spec F2-004, `@docs/03a` (sekcja 9), `@docs/03` (Charge, Payment), `@docs/02` (ADR-008), `@docs/11` (metryki `collections`, `receivables_aging`).

**Część 1/3 · dane.** `pnpm gen module billing`. Migracja: `charges`, `payments`, `allocations` (wszystkie append-only), `invoice_requests`, `provider_contracts`, `provider_settlements`. RLS: `charges`/`payments` `tenant_location`; saldo pacjenta (widok `billing.patient_balances` = suma należności − alokacje − storna) `tenant_all`. pgTAP: brak update/delete; `allocations.amount` nie przekracza należności (trigger).

**Część 2/3 · domena i aplikacja.** `settleAppointment(appointmentId, items[])`: tworzy `charges` z usług wizyty (cena z planu, jeśli pozycja z zaakceptowanego planu, inaczej `priceFor` na dzień wizyty; rabat z powodem), oznacza `plan_items` jako `done`, zdarzenie `appointment.settled.v1`; `recordPayment(patientId, amount, method, allocations?)` (domyślna alokacja FIFO do najstarszych należności, nadpłata = saldo; `receipt_number` opcjonalny do F3), `reversePayment`/`reverseCharge` (storno z powodem, uprawnienie `billing.reverse`), `applyDeposit`; zapytania `getPatientBalance`, `listDayCashReport(locationId, day)` (uzgodnienie kasy: gotówka/karta/przelew), `listReceivablesAging`. Reguły: storno storna zabronione; płatność ujemna tylko jako storno; alokacje sumują się do kwoty płatności (`Money.allocate`). Testy AC.

**Część 3/3 · UI.** Panel „Rozliczenie wizyty” w Dziś/terminarzu (pozycje z usług wizyty i planu, rabat z powodem, kwota do zapłaty, przyjęcie płatności z metodą, numer paragonu, wydruk potwierdzenia PDF), karta pacjenta → zakładka Finanse (należności, płatności, saldo, storna), `/finanse` (raport dnia per gabinet, uzgodnienie kasy, należności wg wieku, eksport CSV). e2e: rozliczenie + płatność + storno z powodem; test, że suma raportu dnia = suma płatności.

---

### K05 · Rozliczenia wykonawców (F2-005)  [money]

**Kroki.** Domena: `settlementFor(contract, charges, labOrders, materials, period)` (podstawa `performed` = należności z `charged_at` w miesiącu; `collected` = alokacje w miesiącu; stawka; potrącenia lab: zlecenia z `received_at`/`completed_at` w miesiącu przypisane do wykonawcy × udział; `minimum_monthly`; `rules` per kategoria), wynik z liniami (`charge_id`, kwota, udział). Przypadki użycia: `createContract` (z walidacją nakładania okresów), `previewSettlement`, `approveSettlement` (zamrożone, append-only), `correctSettlement` (korygujące z odwołaniem). UI: `/finanse/rozliczenia` (miesiąc, lista wykonawców, podgląd linii, zatwierdzenie, PDF zestawienia), pulpit lekarza w F3 pokaże `provider_fee_accrued`. Test: zestaw wzorcowy z ręcznie policzonym rozliczeniem (arkusz w `golden/settlements.md`) zgadza się co do grosza.

---

### K06 · Eksport do Optimy i faktury (F2-006)

**Kroki.** Port `AccountingExport`; adapter `optima-export` w formacie uzgodnionym z biurem (parametryzowany: CSV z kolumnami, kodowanie, separator; lub Comarch API, jeśli biuro potwierdzi), zadanie workera `accounting.export.daily` 22:00 (sprzedaż, płatności, `invoice_requests` dnia) z plikiem w magazynie i wpisem w `integration_log`; raport uzgodnień (różnice kasa vs Crux) na `/finanse`. `invoice_requests`: formularz w panelu rozliczenia (dane nabywcy, NIP z walidacją, pozycje), status po imporcie w Optimie (ręczne potwierdzenie numeru faktury w F2). Test kontraktowy formatu pliku na zestawie wzorcowym.

---

### K07 · Laboratorium w planach i wizytach (F2-007)

**Kroki.** Rozszerzenia `lab`: zlecenie tworzone z pozycji planu (`plan_item_id`), `return_appointment_id` z walidacją (wizyta oddania może być w innym gabinecie; alert dzień przed), koszt zlecenia widoczny w rozliczeniu wykonawcy (K05), zdarzenie `lab_order.completed.v1` → pozycja planu `done` po oddaniu pracy. UI: w edytorze planu „Zleć do pracowni” dla pozycji Z5; w panelu wizyty „Prace lab na tę wizytę”.

---

### K08 · Magazyn plików w UE (F2-008)  [security]

**Przeczytaj.** `@docs/02` (ADR-026), `@docs/04` (sekcja 5 pkt 6), `@docs/03a` (`files`).

**Kroki.** Port `FileStoragePort` (`put(stream, { tenantId, patientId?, kind, mime })` → `fileId`; `signedUrl(fileId, { ttlSeconds: 60, actor })` — generuje tylko po `authorize` i loguje dostęp; `delete` zabronione dla `kind` klinicznych (object lock); `list`), adapter `storage-s3` (S3 zgodny: Hetzner lub Scaleway; SSE włączone; wersjonowanie; bucket per tenant lub prefiks per tenant z polityką), atrapa z folderem. Migracja `files` (jeśli nie powstała w K02) z `retention_until`, `sha256`. Skanowanie plików przy wgrywaniu (typ MIME po treści, limit rozmiaru, ClamAV w workerze jako zadanie asynchroniczne; plik niedostępny do czasu wyniku). Przepięcie generatora PDF (K02) i podpisów (K03) na port. Kopia nocna z K09-F0 przepięta na ten magazyn. Test kontraktowy adaptera na lokalnym MinIO w CI.

**Zatrzymaj się, gdy.** Dostawca magazynu nie ma DPA lub regionu w UE.

---

### Po F2: bramka

Rozliczenie miesięczne z Crux = ręczne co do grosza; uzgodnienie kasy 2 tygodnie bez różnic; 100% planów z Crux. Wpis w ledger.
