# AGENTS.md: zasady dla agentów AI pracujących nad Crux

Wersja 2.1 · 6 listopada 2026. Ten plik czyta każdy agent (Cursor, Claude, inne) przed zmianą kodu. Zasady są twarde. Jeśli zadanie wymaga złamania którejś z nich, **zatrzymaj się i zapytaj człowieka**.

## Kontekst w 6 linijkach

- Crux to wewnętrzny system sieci gabinetów stomatologicznych zenit.stomatologia (Polska). Przetwarza dane o zdrowiu (RODO art. 9) i dokumentację medyczną (20 lat; rozporządzenie MZ z 6.04.2020, § 1 ust. 6).
- Stos: TypeScript (strict), Next.js 16 App Router (Turbopack, `proxy.ts`, bez Cache Components), Drizzle ORM, PostgreSQL 17 (Supabase, `eu-central-1`, Data API wyłączone), pg-boss, Tailwind v4 + komponenty w `packages/ui`, Vitest, Playwright, pgTAP, Storybook.
- Architektura: modularny monolit; moduły w `packages/modules/*` z warstwami `domain` / `application` / `infrastructure` i jednym publicznym `index.ts`; porty i adaptery dla integracji; outbox; schemat `analytics` dla dashboardów; `@crux/interop` mapuje domenę na FHIR R4/CDA.
- Wielodostępność: `tenant_id` = podmiot leczniczy (administrator danych), `location_id` = gabinet. Pacjent należy do tenanta, czyli do całej sieci. RLS przez claims ustawiane w `withActor`.
- Kod, nazwy w bazie i commity po angielsku. Interfejs, dokumentacja i komunikaty po polsku (`packages/i18n`). Słownik: `docs/03-model-domeny.md`; schemat: `docs/03a-schemat-bazy.md`.
- Strażnicy: `pnpm gen` (szkielety), `pnpm doctor` (reguły), `dependency-cruiser` (granice), znaczniki `[ID/ACn]` w testach, `prompts/ledger.md` (pamięć projektu).
- Wydania: jednostką dostarczania jest wydanie (`docs/07`, sekcja 2). **Wydanie 1.0 „Krasnodrzew” nie przetwarza danych pacjentów** (ADR-032): do czasu wydania 1.1 w repo nie ma tabel ani pól z danymi pacjentów. Prompty mają identyfikatory `K01`, `K02`… w obrębie fazy (`prompts/`); „P1” w dokumentach to wyłącznie Platforma P1 (e-zdrowie).

## Zawsze

1. Przed pisaniem kodu przeczytaj specyfikację z `docs/specs/`, odpowiednie sekcje `docs/01`, `03`, `03a` i 10 ostatnich wpisów `prompts/ledger.md`. Zacznij od planu (pliki, migracje, testy) i pokaż go, zanim zaczniesz implementację. Pierwszy krok implementacji to `pnpm gen`.
2. Logika biznesowa żyje w `domain` (czyste funkcje i typy, bez I/O) i `application` (przypadki użycia). Komponenty React, server actions (≤ 25 linii) i route handlery są cienkie: walidują (Zod), wołają przypadek użycia, zwracają wynik.
3. Każde wejście walidujesz Zod. Każda komenda ma `commandId` (idempotencja). Każdy przypadek użycia sprawdza `authorize(actor, permission, scope)`.
4. Każda nowa tabela: wpis w `03a`, `id uuid` (UUIDv7), `tenant_id`, w razie potrzeby `location_id`, `created_at`, `created_by`, komentarz `rls:/append_only:/retention:`, RLS wg wzorca, trigger audytu, test pgTAP izolacji tenantów i gabinetów.
5. Pieniądze to `bigint` w groszach i typ `Money`. Czas to `timestamptz` w UTC z `ctx.clock`, prezentowany w Europe/Warsaw przez `@crux/shared/time`.
6. Każda zmiana danych pacjenta, dokumentacji i finansów zostawia ślad w audycie i zdarzenie domenowe (z wersją `.v1`). Odczyt karty pacjenta, wpisu, pliku, badania, eksport i wydruk logują dostęp (`audit.access_log`).
7. Do każdej funkcji dopisujesz testy: jednostkowe dla domeny, integracyjne dla przypadku użycia z bazą i RLS, pgTAP dla tabel, e2e dla ścieżki krytycznej. Kryteria akceptacji ze specyfikacji mają testy z nazwą `[ID/ACn]`.
8. Komunikacja z systemami zewnętrznymi (P1, SMS, KSeF/Optima, ZnanyLekarz, obrazowanie, LLM, magazyn plików) idzie wyłącznie przez port w `@crux/integrations` i outbox. Nigdy z UI ani z domeny.
9. Interfejs budujesz wyłącznie z komponentów `packages/ui` i tokenów z `packages/ui/brand/tokens.css` (kopia pakietu marki; zasady w `docs/14` i `docs/06`). Logo zawsze z pliku SVG, nigdy z fontu; personel widzi znak Crux, pacjent widzi tylko zenit.stomatologia. Gabinety: „01 Nowodworska”, „02 Białowieska”. Nowy komponent najpierw w `packages/ui` ze stroną w Storybooku. Metryka na ekranie tylko z rejestru (`docs/11`), w formie z rejestru (łuk obłożenia, siatka kuleczek, wykres kropkowy, linia, słupki, tabela); wykres kołowy nie istnieje.
10. Gdy zmieniasz zasadę architektury, dopisujesz ADR w `docs/02` oraz aktualizujesz `AGENTS.md`/`.cursor/rules` w tym samym PR (`pnpm doctor --update-lock`). Po każdym kroku dopisujesz wpis do `prompts/ledger.md`.

## Nigdy

- Nie edytuj migracji, która trafiła na `main`. Zawsze nowa migracja. Zmiany niszczące tylko expand → migrate → contract z etykietą `destructive-migration`.
- Nie wyłączaj RLS, nie twórz polityki `using (true)` na tabelach z danymi pacjentów, nie używaj `service_role`, nie dodawaj `security definer` poza listą w `tools/doctor/allowlist.json`.
- Nie kasuj fizycznie (`DELETE`) ani nie aktualizuj wpisów dokumentacji, wersji, zgód, kosztorysów, płatności, paragonów, faktur, rozliczeń ani audytu. Korekta to nowa wersja z powodem, storno to nowy rekord.
- Nie zapisuj danych pacjenta (imię, PESEL, telefon, treść wpisu, rozpoznanie, kwota z kontekstem pacjenta) w logach, komunikatach błędów, nazwach plików, URL-ach, payloadach outboxa, analityce ani w Sentry. Używaj identyfikatorów.
- Nie dodawaj zależności npm bez wpisu w `docs/zaleznosci.md`. Biblioteki lub usługi przetwarzające dane pacjentów poza naszą infrastrukturą wymagają ADR i umowy powierzenia; dostawcy wyłącznie z przetwarzaniem w UE.
- Nie importuj z wnętrza innego modułu. Tylko `@crux/x`.
- Nie usuwaj ani nie osłabiaj testu, żeby przeszedł. Jeśli test jest zły, napisz dlaczego i poproś o decyzję.
- Nie dodawaj funkcji sugerujących rozpoznanie lub leczenie ani analizujących obrazy medyczne (MDR, ADR-017). Podgląd RTG w Crux bez narzędzi pomiarowych i filtrów diagnostycznych (ADR-028).
- Nie wymyślaj kodów ICD, numerów NPWZ, kodów resortowych ani danych testowych przypominających prawdziwe osoby. Dane testowe z fabryk `packages/testing`.
- Nie twórz synonimów pojęć ze słownika (`visit`, `clinic`, `branch`, `customer`, `client`, `bill`, `slot` jako encja).
- Nie dodawaj do wpisów obłożenia (`chair_occupancy`) żadnego pola identyfikującego pacjenta; identyfikacja pacjenta należy do `appointments` (od 1.1).
- Nie renderuj w nawigacji pozycji „wkrótce”: funkcja spoza bieżącego wydania jest niewidoczna (flagi).
- Nie „poprawiaj” dokumentacji, żeby pasowała do kodu, bez ADR. Jeśli kod ma rację, najpierw decyzja, potem kod.

## Definicja ukończenia (każdy krok i PR)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:db`, `pnpm doctor` przechodzą
- [ ] nowe tabele mają wpis w `03a`, RLS, komentarz, trigger audytu i test pgTAP
- [ ] kryteria akceptacji ze specyfikacji mają testy `[ID/ACn]` (doctor: `spec.traceability`)
- [ ] brak danych pacjenta w logach (sprawdź nowe `logger.*`) i w zdarzeniach
- [ ] teksty interfejsu w `packages/i18n/pl`, ton zgodny z `docs/06`; lista kontrolna `docs/14`, sekcja 11, i zrzut ekranu w PR
- [ ] zaktualizowana dokumentacja i ADR, jeśli zmieniła się zasada lub model danych
- [ ] wpis w `prompts/ledger.md`; PR opisuje: co, dlaczego, jak przetestowano, ryzyka, migracje, prompt

## Gdy nie wiesz

Zatrzymaj się i zadaj jedno konkretne pytanie. Lepsze pytanie niż kod, który trzeba będzie wyrzucić. Szczególnie przy: prawie (dokumentacja, zgody, RODO, P1), pieniądzach, kasowaniu danych, zmianach schematu, uprawnieniach, obrazowaniu, AI.
