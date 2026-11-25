# F3 · CRM i dashboardy = wydanie 2.1 „Cynamonowiec”: prompty K01–K09

Wymaga ukończonego wydania 2.0 (F2). Schemat `analytics`, rejestr metryk, komponenty wykresów, `FilterBar` i trzy pulpity istnieją od wydania 1.0 (F0-011): tutaj je tylko rozszerzamy. Specyfikacje: F3-001 napisana; pozostałe z backlogu. Rejestr metryk: `docs/11`, sekcja 4. Każda metryka = kod + test + wpis, inaczej `doctor` czerwony.

---

### K01 · Schemat `analytics` i zasilanie (F3-002)  [security]

**Przeczytaj.** `@docs/02` (ADR-027), `@docs/03a` (sekcja 12), `@docs/11` (sekcje 1, 8), `@docs/01` (sekcja 12).

**Część 1/3 · wymiary i fakty (expand).** Moduł `analytics` istnieje od 1.0 (`03a`, 12.1: `dim_date`, `dim_location`, `dim_chair`, `dim_provider`, `dim_category`, `fact_chair_capacity`, `fact_chair_occupancy`, `fact_day_closures`, `refresh_log`). Migracja dokłada: `dim_service`, `dim_patient_anon` (surrogate `patient_key`, rok urodzenia, płeć, gabinet macierzysty, źródło, pierwsza wizyta; **żadnych** kolumn identyfikujących; test `doctor` reguła `analytics.no-pii`: zabronione nazwy kolumn `first_name`, `last_name`, `pesel*`, `phone`, `email`, `address`), `fact_appointments`, `fact_procedures` (do F4: pozycje rozliczeń), `fact_charges`, `fact_payments`, `fact_plan_items`, `fact_recall_tasks` (po K05), `fact_lab_orders`, `fact_messages`; `fact_chair_capacity` dostaje minuty grafików wykonawców (dla `provider_utilization`). Indeksy `(tenant_id, location_id, date_key)`. RLS `tenant_location` + widoki per rola: `v_self_*` (`provider_key = auth.staff_id()`), `v_location_*`, `v_network_*`; uprawnienia `analytics.view_self/location/network`. pgTAP: lekarz nie widzi wierszy innego lekarza w `v_self_*`; kierownik nie widzi innego gabinetu.

**Część 2/3 · zasilanie (expand).** Worker `analytics.refresh` z 1.0 rozszerzony o nowe fakty (przyrostowe co 5 min z `updated_at`/`created_at` z ostatnich 48 h; upsert po kluczu naturalnym; pełne 02:10 dla 13 miesięcy); `fact_chair_occupancy` dla gabinetów w trybie `appointments` liczy z wizyt (F0-010, 1.1); `refresh_log` bez zmian. Idempotentne (test).

**Część 3/3 · testy wzorcowe.** Generator zestawu wzorcowego (K12 z 1.0, rozszerzony w 1.1 o pacjentów i wizyty) rozszerzony o należności, płatności, plany; `golden/expected.json` z wartościami policzonymi niezależnie (`golden/verify.sql` + arkusz); test porównuje fakty z naiwnym SQL.

---

### K02 · Rejestr metryk jako kod (F3-003)

**Przeczytaj.** `@docs/11` (sekcja 4: wszystkie tabele), `@docs/10` (3.7).

**Kroki.** Rejestr i `runMetric` istnieją od 1.0 (K13). Dopisz `metrics/<id>.ts` dla każdej metryki z rejestru dostępnej w 2.1 (wszystkie z 4.1–4.5 poza oznaczonymi F4), w tym zmianę źródła `revenue_realized` na `charges` (nowy wpis `since: '2.0'` w tej samej metryce; test, że dla okresów przed 2.0 wartości z wpisów obłożenia pozostają) i `chair_utilization` dla trybu `appointments`; test per metryka na zestawie wzorcowym (`expected.json`) i test drążenia (`[F3-003/AC2]`: suma rekordów z `drilldown` = wartość metryki dla `revenue_realized`, `no_show_rate`, `plan_acceptance_rate`, `recall_effectiveness`). Reguły `doctor` `analytics.metric-registered` i `ui.metric-form` (z 1.0) przechodzą.

---

### K03 · Pulpit sieci (F3-001)  [ui]

**Przeczytaj.** `@docs/specs/F3-001-pulpit-sieci.md`, `@docs/11` (sekcje 3, 4.6, 5.5, 6, 9), `@docs/06` (sekcje 4.1, 4.2, 6: anatomia kafla i karty, model kuleczkowy), `@docs/14-guideline-aplikacji.md` (sekcja 6: procedura przy każdym wykresie), `@design/crux-dashboard-prototyp.html`, wzorce `packages/ui/src/charts/__reference__/*.svg`.

**Część 1/3 · komponenty wykresów (uzupełnienia).** Komplet wykresów z `06`, sekcja 6, istnieje od 1.0 (`packages/ui/src/charts/`, K08). Tutaj: `BarList variant="funnel"` z wartością planów otwartych pod lejkiem, `DotGrid` z trybem „1 kuleczka = 1%” dla dużych liczebności, `LineChart` z wieloma seriami wykonawców (legenda zwijana powyżej 4 serii), `ChartCard` z eksportem CSV karty; nowe historie Storybooka i testy wizualne dla tych wariantów.

**Część 2/3 · filtry i strona.** `FilterBar` z 1.0 rozszerzony o `zrodlo` (kontrakt URL z `docs/11`, sekcja 3: `okres`, `porownaj`, `gabinet`, `wykonawca`, `kategoria`, `zrodlo`), walidacja po stronie serwera wg roli (lekarz nie może ustawić `wykonawca=inny`; test), zapamiętywanie w `localStorage`. `/pulpit` z 1.0 rozszerzony do układu z `11`, 5.5 (rząd kafli: 6 na ≥ 1440 px, 4 poniżej; wykres główny przychodu per gabinet; siatka 2 × N: łuki obłożenia per gabinet, wykres kropkowy porównania gabinetów z tabelą w przełączniku, lejek planów, siatka kuleczek recall, źródła nowych pacjentów, rankingi tylko dla `analytics.view_network`; stopka z `refreshed_at`). Forma każdej karty z pola `forma` w rejestrze metryk (`11`, 4.6). Dane przez `runMetric` w Server Components z `Suspense` per karta; cache 60 s.

**Część 3/3 · drążenie i eksport.** `/lista/[encja]` z `metric` i filtrami: zakładki „w liczniku/w mianowniku”, `DataTable`, suma kontrolna = kafel (`[F3-001/AC4]`), CSV; PDF pulpitu (A4 poziomo, szata marki) generowany w workerze na żądanie (link w kolejce). e2e: zmiana filtra przeładowuje karty; link z filtrami odtwarza widok; lekarz na `/pulpit` dostaje 403 (przekierowanie do `/pulpit/moje`); klawiatura na wykresie.

**Ograniczenia.** Bursztyn nie występuje na pulpicie (poza fokusem). Kolory gabinetów z `locations.color_key`. Żadnych wykresów kołowych ani pierścieniowych; udziały pokazuje siatka kuleczek lub pasek części. Przy każdej karcie zrzut ekranu w PR (procedura `14`, 6.1, pkt 9).

---

### K04 · Pulpit gabinetu i pulpit lekarza (F3-004)

**Kroki.** `/pulpit/gabinet` (układ 5.3; kierownik zablokowany na swój gabinet; należności wg wieku i pacjenci z saldem tylko tu), `/pulpit/moje` (układ 5.4; `v_self_*`; druga liczba „mediana sieci” z `v_network_*` bez nazwisk, liczona metryką `*_network_median`; listy: plany do domknięcia, pacjenci bez kontroli po Z4, od F4 wpisy niepodpisane). Testy RLS i e2e per rola.

---

### K05 · Recall: reguły, zadania, lista do dzwonienia (F3-006)

**Przeczytaj.** spec F3-006, `@docs/03a` (sekcja 11), `@docs/03` (RecallTask), `@docs/04` (pytanie 7 do prawnika: do czasu odpowiedzi recall tylko telefon lub SMS transakcyjny bez treści marketingowej).

**Kroki.** `pnpm gen module crm`. Migracja `recall_rules`, `recall_tasks`, `recall_contacts`, `campaigns`. Worker: `appointment.completed.v1` → dla usług z regułą tworzy zadanie z `due_on` (dedupe po `(patient, rule, due_on)`), codziennie 7:30 oznacza `expired` po 90 dniach bez kontaktu; `recall.sms` (jeśli `preferred_channel = sms` i prawnik potwierdzi) wysyła zaproszenie z linkiem do rezerwacji online z prewypełnieniem; w przeciwnym razie zadanie na listę do dzwonienia. Przypadki użycia: `setRecallRule`, `logRecallContact` (wynik, notatka), `bookFromRecall` (otwiera dialog wizyty z „najbliższy termin w sieci, preferuj gabinet macierzysty”), `closeRecallTask`. UI: `/recall` (lista do dzwonienia: priorytet = dni po terminie × wartość ostatniej wizyty; filtry; skróty: `D` dodzwoniono, `U` umówiono, `N` nie odbiera; panel pacjenta z historią i przyciskiem „zadzwoń”), zakładka w karcie pacjenta. Metryki `recall_effectiveness`, `recall_backlog` w rejestrze z testem.

---

### K06 · Zgody marketingowe i kampanie (F3-007)  [security]

**Kroki.** Rejestr zgód (`channel_consents`) w karcie pacjenta z treścią klauzuli (wersjonowana w `platform.settings`), źródłem (papier/tablet/online) i cofnięciem; STOP z SMS (K07-F1) cofa; `campaigns`: odbiorcy wyłącznie z aktywną zgodą marketingową (test: kampania nie trafia do pacjenta bez zgody), limit 1 kampania/pacjent/miesiąc, podgląd liczby odbiorców, wysyłka przez worker w oknie 10–18, statystyki doręczeń. UI `/recall/kampanie` (tylko `marketing.manage`). Treść kampanii bez danych medycznych (reguła szablonów jak w F1-K07).

---

### K07 · Przegląd 60 sekund i Koniec dnia (F3-005)

**Kroki.** `/dzis/odprawa`: strona z 6 sekcjami z `docs/11`, 5.2 (dane z tabel operacyjnych + `analytics` dla obłożenia tygodnia), przycisk „Odprawa zakończona” zapisujący znacznik (metryka `huddle_done` w ustawieniach gabinetu, opcjonalna); tryb pełnoekranowy na ekran w zapleczu. Worker `report.end_of_day` 21:00: tabela gabinetów i 3 zdania deterministyczne z szablonów (`i18n/pl/reports`), bez LLM i bez nazwisk pacjentów (test szablonu: brak pól pacjenta), wysyłka e-mail (port `EmailSender`, adapter Microsoft Graph lub dostawca z UE) i opcjonalnie Teams webhook; link do `/pulpit?okres=dzis`. Test: raport dla zestawu wzorcowego zgadza się z metrykami.

---

### K08 · Cele i alerty (F3-008)

**Kroki.** `platform.settings` klucze `targets.*` per gabinet i miesiąc (edycja `/ustawienia/cele`, uprawnienie `analytics.manage_targets`), `porownaj=cel` na pulpitach (linia celu na wykresie, delta do celu na kaflach). Worker `alerts.daily` 7:30: reguły z `docs/11`, sekcja 7, zapis do `platform.alerts` (tenant, gabinet, typ, wartość, próg, link), wyświetlanie na Dziś i w raporcie; alert znika, gdy warunek ustąpi; bez kolorów alarmowych (StatusPill `uwaga`). Test reguł na zestawie wzorcowym.

---

### K09 · SSO Microsoft Entra ID (F3-009) i ocena local-first (ADR-023)

**Kroki.** (a) Supabase Auth: dostawca OIDC Entra ID (tenant organizacji), mapowanie `auth_user_id` ↔ `staff_members` po e-mailu z weryfikacją domeny, MFA dalej wymagane (Entra lub TOTP; polityka w `docs/ops`), logowanie hasłem zostaje jako zapasowe dla kont bez Microsoft 365. e2e z atrapą OIDC. (b) Dokument `docs/spikes/local-first.md`: liczba incydentów łączności z `integration_log`/zgłoszeń, test PowerSync lub ElectricSQL na terminarzu w gałęzi spike (reguły synchronizacji per gabinet, szyfrowanie lokalne), koszt; rekomendacja → ADR (przyjęta lub odrzucona z datą ponownej oceny).

---

### Po F3: bramka

Miesiąc decyzji zarządu bez Excela (ankieta + brak nowych arkuszy), recall > 40%, raport końca dnia 30 dni bez błędów. Wpis w ledger.
