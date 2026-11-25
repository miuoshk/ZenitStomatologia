# 02 · Decyzje architektoniczne (ADR)

Wersja 2.1 · 6 listopada 2026. Rejestr decyzji. Każda ma: kontekst, decyzję, konsekwencje, alternatywy i warunek powrotu. Nową decyzję dopisujesz na końcu według szablonu. Starej nie kasujesz: zmieniasz status na „zastąpiona przez ADR-0xx” albo „uzupełniona przez ADR-0xx”.

| Nr | Decyzja | Status |
|---|---|---|
| 001 | Modularny monolit w monorepo | przyjęta |
| 002 | TypeScript wszędzie | przyjęta |
| 003 | Next.js App Router jako aplikacja webowa | przyjęta, uzupełniona przez 030 |
| 004 | PostgreSQL w Supabase (Frankfurt) z planem wyjścia | przyjęta warunkowo, uzupełniona przez 020 i 026 |
| 005 | Drizzle ORM, migracje SQL, RLS przez claims w transakcji | przyjęta, uzupełniona przez 020 (Data API wyłączone) |
| 006 | Model tenant / location / group | przyjęta |
| 007 | UUIDv7, grosze, timestamptz | przyjęta |
| 008 | Dokumentacja i finanse tylko dopisywane, łańcuch skrótów | przyjęta |
| 009 | Outbox + pg-boss w osobnym workerze | przyjęta |
| 010 | Supabase Auth z obowiązkowym MFA, później SSO Entra ID | przyjęta |
| 011 | P1 przez bramkę pośredniczącą za portem `P1Gateway` | przyjęta, kandydat potwierdzony (Medfile Konektor API) |
| 012 | Obrazowanie: Romexis jako system diagnostyczny, Crux jako indeks | przyjęta, uzupełniona przez 028 |
| 013 | Wdrożenie metodą strangler fig | przyjęta |
| 014 | UI: Tailwind, Radix, własny design system, Recharts | przyjęta, uzupełniona przez 031 |
| 015 | Hosting aplikacji: Vercel fra1, gotowość do przeniesienia | przyjęta warunkowo |
| 016 | Obserwowalność bez danych pacjenta | przyjęta, uzupełniona przez 029 (OpenTelemetry) |
| 017 | Granice funkcji AI (MDR, AI Act) | przyjęta, uzupełniona przez 024 |
| 018 | Kod po angielsku, interfejs po polsku | przyjęta |
| 019 | Terminarz jako własny komponent | do potwierdzenia w F1 |
| 020 | Supabase: osobna organizacja, plan, konfiguracja twarda | przyjęta |
| 021 | HL7 FHIR R4 jako model wymiany przy relacyjnym modelu wewnętrznym | przyjęta |
| 022 | Czas i daty: date-fns v4 + @date-fns/tz, strefa w jednym miejscu | przyjęta |
| 023 | Tryb offline: PWA tylko do odczytu, ocena local-first w F3 | przyjęta |
| 024 | Warstwa AI za portem `LlmPort`, przetwarzanie w UE | przyjęta |
| 025 | Szyfrowanie aplikacyjne i zarządzanie kluczami | przyjęta |
| 026 | Pliki medyczne w magazynie obiektowym w UE za `FileStoragePort` | przyjęta |
| 027 | Analityka: schemat gwiazdy, metryki jako kod, odświeżanie przyrostowe | przyjęta |
| 028 | Obrazowanie: Orthanc + DICOMweb + lokalny agent, podgląd bez diagnostyki | przyjęta |
| 029 | Strażnicy architektury: generator, `crux-doctor`, śledzenie specyfikacji, rejestr promptów | przyjęta |
| 030 | Next.js 16: tryb dynamiczny, `proxy.ts`, bez Cache Components do F3 | przyjęta |
| 031 | Pakiet marki jako źródło tokenów, dwie marki w jednym systemie, model kuleczkowy | przyjęta |
| 032 | Wydania jako jednostka dostarczania; 1.0 bez danych pacjentów; obłożenie foteli jako moduł wzorcowy | przyjęta |
| 033 | Domeny: Crux na `crux.zenitstomatologia.pl`, strona dla pacjentów na domenie głównej | przyjęta |

---

## ADR-001 · Modularny monolit w monorepo

**Kontekst.** Jedna osoba techniczna plus Cursor. System ma 12+ obszarów domeny, które muszą być spójne transakcyjnie (wizyta, wpis, należność).
**Decyzja.** Jedno repo (pnpm workspaces + Turborepo), aplikacje w `apps/`, moduły w `packages/modules/`. Granice modułów wymuszone lintem i testem architektury.
**Konsekwencje.** Jedna baza, jedna transakcja, prosty deploy. Dyscyplina granic pilnowana przez CI, bo AI chętnie importuje „na skróty”.
**Alternatywy.** Mikroserwisy (za drogie, rozjazd kontraktów), płaska aplikacja Next.js (szybki start, chaos po pół roku promptowania).
**Wracamy, gdy** jeden moduł zacznie wymagać innego cyklu wdrożeń lub skali (najpewniej obrazowanie).

## ADR-002 · TypeScript wszędzie

**Kontekst.** Kod pisze głównie Cursor. Potrzebny jeden język od bazy do UI, z typami, które łapią błędy AI przed uruchomieniem.
**Decyzja.** TypeScript `strict` (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) w web, workerze, agencie i pakietach. Typy bazy ze schematu Drizzle. Schematy Zod współdzielone między formularzem a serwerem. Node 22 LTS.
**Konsekwencje.** Modele językowe piszą TS najlepiej ze wszystkich języków typowanych; ekosystem React i narzędzi jest największy; błąd typu w jednym module łamie kompilację w innym.
**Alternatywy.** Python/Django (dwa języki), C#/.NET (świetny do integracji sprzętowych na Windows, słabszy front, mniejsza biegłość AI w nowoczesnym React), Go (słabszy ekosystem UI).
**Wyjątek.** Lokalny agent `apps/bridge` może dostać komponent w .NET, jeśli TWAIN lub VDDS tego wymuszą (ADR-028).

## ADR-003 · Next.js App Router

**Decyzja.** Next.js (App Router, React Server Components, server actions) jako jedna aplikacja dla UI i cienkiej warstwy API. Logika żyje w `packages/modules`, więc framework da się wymienić. Szczegóły wersji 16: ADR-030.
**Konsekwencje.** Mniej kodu łączącego front i back; trzeba pilnować, by server actions pozostały cienkie (reguła w `.cursor/rules`).
**Alternatywy.** SPA (Vite) + NestJS (czystszy podział, dwa razy więcej kodu), React Router 7 (porównywalny, mniej danych treningowych).

## ADR-004 · PostgreSQL w Supabase (Frankfurt) z planem wyjścia

**Kontekst.** Czy Supabase kwalifikuje się do danych o zdrowiu i dokumentacji medycznej w Polsce?
**Ustalenia (5.11.2026).** Według [Data Residency and Transfers FAQ (6.10.2026)](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq): baza, Auth, Storage i kopie zostają w regionie; poza regionem: dane konta, logowany dostęp wsparcia, telemetria (logi w UE), CDN dla Storage. Procesor główny Supabase Pte. Ltd. (Singapur), wsparcie Supabase, Inc. (USA). Transfery na SCC w DPA, opublikowana TIA. Nie znamy polskiego wymogu lokalizacji dokumentacji w kraju; § 1 ust. 5–7 rozporządzenia o dokumentacji wymaga bezpieczeństwa i planu przechowywania, bez wymogu terytorium **[do potwierdzenia w opinii prawnej]**.
**Decyzja.** Supabase **kwalifikuje się warunkowo**. Warunki w `04-prawo-i-bezpieczenstwo.md`, sekcja 5, i w ADR-020.
**Konsekwencje.** Szybki start, gałęzie baz dla PR, gotowe Auth. Ryzyko prawne transferów jest udokumentowane i ograniczone; zostaje ryzyko resztkowe.
**Alternatywy.** Postgres u dostawcy z UE (Hetzner, OVHcloud, Scaleway, Aiven) lub self-hosted Supabase: pełna kontrola jurysdykcji, pełna odpowiedzialność za aktualizacje i kopie.
**Wracamy, gdy** TSUE unieważni DPF i UODO zajmie stanowisko wobec SCC do USA, opinia prawna wskaże wymóg lokalizacji, Supabase zmieni zakres przetwarzania poza regionem, albo koszt Team przekroczy koszt Postgresa z UE plus utrzymanie.

## ADR-005 · Drizzle ORM, migracje SQL, RLS przez claims w transakcji

**Decyzja.** Schemat bazy w TypeScript (Drizzle) jako źródło prawdy, w tym polityki RLS (`pgPolicy`). `drizzle-kit generate` tworzy migracje SQL przeglądane przed scaleniem. Funkcje, triggery i rozszerzenia jako migracje SQL ręczne (numerowane w tym samym ciągu). Dostęp z serwera przez `withActor(actor, tx => …)`: otwiera transakcję, wykonuje `set local role authenticated` i `set local request.jwt.claims = '<json>'`, więc RLS działa dla zapytań serwerowych bez `supabase-js`. Połączenie przez dedykowaną rolę `crux_app` (LOGIN, członek `authenticated`, bez `BYPASSRLS`), przez Supavisor w trybie transakcyjnym (port 6543) dla web i w trybie sesyjnym dla workera.
**Konsekwencje.** Jedno miejsce prawdy o schemacie, typy wprost z modelu, RLS także dla serwera. Uzupełnienie w ADR-020: Data API wyłączone.
**Alternatywy.** Prisma (słabe RLS), czyste SQL + Kysely (więcej pracy ręcznej), `supabase-js` z serwera (słabsza kontrola transakcji).

## ADR-006 · Model tenant / location / group

**Decyzja.** `tenant` = podmiot leczniczy (administrator danych), `location` = gabinet, `group` = poziom właścicielski z dostępem tylko do agregatów. Każda tabela operacyjna ma `tenant_id`, tabele dotyczące miejsca także `location_id`. Szczegóły: `01-architektura.md`, sekcja 7.
**Konsekwencje.** Gotowość na gabinety należące do różnych spółek bez przebudowy; raporty grupowe bez danych osobowych.

## ADR-007 · UUIDv7, grosze, timestamptz

**Decyzja.** Identyfikatory UUIDv7 (funkcja `uuid_generate_v7()` w schemacie `extensions`, w Postgresie 18 natywne `uuidv7()`). Kwoty w groszach jako `bigint` i typ `Money`. Czas w `timestamptz` (UTC), prezentacja w Europe/Warsaw. Zakres wizyty jako `tstzrange` z więzem wykluczającym nakładanie na tym samym fotelu i u tego samego wykonawcy (`btree_gist`).
**Konsekwencje.** Brak błędów zaokrągleń, brak podwójnych rezerwacji niezależnie od błędów w kodzie, poprawne przejścia czasu letniego.

## ADR-008 · Dokumentacja i finanse tylko dopisywane

**Decyzja.** Wpisy kliniczne, zgody, płatności, paragony, faktury, rozliczenia i audyt nie są nigdy aktualizowane ani kasowane po zatwierdzeniu. Korekta to nowa wersja z powodem lub storno. Wpisy pacjenta tworzą łańcuch SHA-256. Uprawnienia `UPDATE`/`DELETE` odebrane roli `authenticated` na poziomie bazy. Podstawa prawna i definicja podpisu wewnętrznego: `04`, sekcje 3–4.
**Konsekwencje.** Integralność i rozliczalność; stan na dowolny dzień; interfejs musi jasno pokazywać wersje i korekty.

## ADR-009 · Outbox + pg-boss w osobnym workerze

**Decyzja.** Komunikacja z systemami zewnętrznymi i zadania cykliczne przez tabelę `outbox` zapisywaną w transakcji komendy oraz kolejkę pg-boss w schemacie `pgboss`. Worker `apps/worker` (Node, kontener Docker) na serwerze w UE.
**Konsekwencje.** Awaria P1 lub bramki SMS nie blokuje recepcji; każda wysyłka ma historię i ponowienia; jeden dodatkowy proces.
**Alternatywy.** Supabase Queues + Edge Functions (Deno, ograniczenia przy podpisach XML), zewnętrzne kolejki z USA (transfer).

## ADR-010 · Supabase Auth z obowiązkowym MFA, później SSO Entra ID

**Decyzja.** Logują się tylko pracownicy. MFA (TOTP lub FIDO2) od pierwszego dnia. Blokada ekranu po 5 min na stanowiskach wspólnych, szybkie odblokowanie. W F3 logowanie przez Microsoft Entra ID (zespół ma Microsoft 365). Konto pacjenta (portal) w F6 jako osobny typ użytkownika. Uwierzytelnianie za `AuthPort`.

## ADR-011 · P1 przez bramkę pośredniczącą

**Kontekst.** Własna integracja z P1 to certyfikaty z CeZ, podpis XAdES, HL7 CDA i FHIR, środowisko integracyjne i ciągłe dostosowania.
**Decyzja.** Port `P1Gateway` (zgłoś zdarzenie medyczne, zaindeksuj dokument EDM, wystaw e-receptę i e-skierowanie, pobierz status, pobierz dokument). Pierwszy adapter: [Medfile Konektor API EDM](https://www.medfile.pl/api-erecepta-ezla) (potwierdzone 5.11.2026: dla zewnętrznych producentów, bez konta Medfile, REST/JSON + XML, FHIR i CDA, OpenAPI 3, środowisko testowe po NDA, produkcja po umowie z listą IP lub VPN, podpisane dokumenty XML na życzenie, certyfikaty ZUS w prywatnym kontenerze, cena na zapytanie). Plan B: integracja natywna. Plan C (awaria): gabinet.gov.pl.
**Do F4** zdarzenia medyczne raportuje obecny program (ADR-013).
**Wracamy, gdy** poznamy warunki umowy, SLA i cenę; jeśli nieakceptowalne, plan B.

## ADR-012 · Obrazowanie: Romexis jako system diagnostyczny, Crux jako indeks

**Decyzja.** Diagnoza w Romexis (CE). Crux: (1) otwiera pacjenta w Romexis jednym kliknięciem przez lokalny agent (`DxStart.exe`, PmBridge), (2) przyjmuje kopie badań przez DICOM do Orthanc i pokazuje podgląd „nie do diagnostyki”, (3) przyjmuje pliki skanerów (STL/PLY/OBJ). Szczegóły i rozwinięcie: ADR-028, `12-obrazowanie-dicom.md`.
**Konsekwencje.** Unikamy klasyfikacji Crux jako wyrobu medycznego; potrzebny agent na stanowiskach i pakiet DICOM w Romexis.

## ADR-013 · Wdrożenie metodą strangler fig

**Decyzja.** Crux przejmuje funkcje obecnego programu etapami: terminarz i pacjenci (F1), finanse i plany (F2), CRM i dashboardy (F3), dokumentacja medyczna z P1 (F4), obrazowanie (F5). Do F4 obecny program zostaje systemem dokumentacji i raportuje do P1. Pacjenci synchronizowani jednorazowo przy starcie F1, potem nowi pacjenci powstają w Crux i są przenoszeni do starego programu na czas wizyty klinicznej (automatem, jeśli stary program ma import, inaczej ręcznie).
**Konsekwencje.** Każda faza daje wartość od razu; przez kilka miesięcy dwa systemy, więc potrzebna instrukcja dla recepcji „gdzie co wpisujemy”.

## ADR-014 · UI: Tailwind, Radix, własny design system, Recharts

**Decyzja.** Tailwind CSS v4 z tokenami marki (`@theme` + zmienne CSS z `06-design-system.md`), prymitywy Radix (komponenty w stylu shadcn/ui skopiowane do `packages/ui` i przestylowane), TanStack Table i TanStack Query, React Hook Form + Zod, Recharts z własnym motywem (sparkline’y i terminarz jako własne SVG), ikony Lucide, Storybook z testami wizualnymi.
**Konsekwencje.** Pełna kontrola wyglądu (marka nie może wyglądać jak domyślny shadcn); modele językowe dobrze znają te biblioteki.

## ADR-015 · Hosting aplikacji: Vercel fra1, gotowość do przeniesienia

**Decyzja.** `apps/web` na Vercel (funkcje w `fra1`, DPA podpisany). Build `output: 'standalone'` i Dockerfile utrzymywany w CI, żeby w jeden dzień przenieść aplikację na serwer w UE. Worker od początku w kontenerze na serwerze w UE (Hetzner Falkenstein/Norymberga lub OVHcloud).
**Wracamy, gdy** zapadnie decyzja z ADR-004 o zmianie jurysdykcji lub koszty Vercel przekroczą koszt własnego serwera.

## ADR-016 · Obserwowalność bez danych pacjenta

**Decyzja.** Sentry (region UE) z wyłączonym zbieraniem danych domyślnych i filtrem usuwającym pola osobowe; logi strukturalne (pino) z listą dozwolonych pól; identyfikatory zamiast danych; OpenTelemetry dla śladów (trace) i metryk z eksporterem do dostawcy w UE lub własnego Grafana/Tempo na serwerze workera. Zabronione: session replay, analityka produktowa śledząca ekrany z danymi pacjentów.

## ADR-017 · Granice funkcji AI

**Decyzja.** Dozwolone bez dodatkowej oceny: transkrypcja i streszczenie wizyty jako szkic do zatwierdzenia przez lekarza, podpowiedzi w komunikacji z pacjentem, analityka biznesowa, wyszukiwanie. Wymaga osobnego ADR i oceny regulacyjnej: wszystko, co sugeruje rozpoznanie, leczenie lub analizuje obrazy medyczne (MDR reguła 11, AI Act). Szczegóły realizacji: ADR-024.

## ADR-018 · Kod po angielsku, interfejs po polsku

**Decyzja.** Identyfikatory, tabele, commity po angielsku. Teksty interfejsu w `packages/i18n/pl` (klucze po angielsku). Słownik PL↔EN w `03-model-domeny.md` jest wiążący.

## ADR-019 · Terminarz jako własny komponent

**Decyzja wstępna.** Własny komponent siatki (kolumny = fotele, wiersze = sloty 5 lub 15 min) z `dnd-kit` i wirtualizacją. Na początku F1 trzydniowy spike porównawczy z komercyjnym FullCalendar Scheduler; wybieramy to, co da lepszy wynik w testach z recepcją (kryteria w `specs/F1-002`).

---

## ADR-020 · Supabase: osobna organizacja, plan, konfiguracja twarda

**Status.** przyjęta (uzupełnia 004 i 005)
**Kontekst.** Organizacja Supabase „Zenit Labs” prowadzi projekt Kurs na LDEK (`eu-central-1`, Postgres 17). Dane medyczne sieci gabinetów należą do innego administratora danych niż platforma edukacyjna. Cennik: Pro 25 USD, Team 599 USD, PITR 100 USD/7 dni, compute Small 15 USD, Medium 60 USD.
**Decyzja.**
1. Nowa organizacja Supabase **„Zenit Stomatologia”** (właściciel: podmiot leczniczy lub spółka operatorska wg opinii prawnej), projekty `crux-staging` i `crux-prod` w `eu-central-1`, Postgres 17+.
2. Plan Pro + PITR 7 dni + compute Small od F0; Medium od F2 (dashboardy); **Team przed uruchomieniem F4** w gabinecie 01.
3. **Data API wyłączone** (żaden schemat nie jest eksponowany przez PostgREST), Realtime wyłączone, Storage tylko bucket `assets` (niemedyczny). Edge Functions nieużywane. Panel: SSO/MFA, dostęp dla dwóch osób, role per projekt (Team).
4. Rozszerzenia: `btree_gist`, `pg_trgm` (wyszukiwanie), `pgcrypto`, `pgaudit` (DDL, role), `pg_cron` (tylko do zadań utrzymaniowych bazy; zadania domenowe idą przez pg-boss), `pg_stat_statements`. Brak `pgsodium`/Vault jako magazynu kluczy (ADR-025).
5. Parametry: `log_statement = none`, brak logowania parametrów, `statement_timeout` 15 s dla roli `authenticated`, `idle_in_transaction_session_timeout` 30 s.
6. Gałęzie Supabase dla PR tylko z danymi z fabryk; staging z danymi syntetycznymi; produkcja nigdy klonowana poza region.
**Konsekwencje.** Czysta granica prawna i rozliczeniowa; wyższy koszt od F4 (Team). Brak PostgREST oznacza, że każdy dostęp do danych przechodzi przez nasz kod, czyli przez `authorize()` i RLS.
**Alternatywy.** Jeden projekt w organizacji Zenit Labs (tańszy, ale miesza administratorów danych i uprawnienia).
**Wracamy, gdy** zmieni się struktura spółek lub cennik.

## ADR-021 · HL7 FHIR R4 jako model wymiany przy relacyjnym modelu wewnętrznym

**Status.** przyjęta
**Kontekst.** P1 przyjmuje zdarzenia medyczne w HL7 FHIR, dokumenty EDM w HL7 CDA (PIK), EHDS wymaga eksportu w EEHRxF (opartym na FHIR), rozporządzenie o dokumentacji wskazuje HL7 i DICOM jako standardy domyślne (§ 1 ust. 6 pkt 6). Jednocześnie wewnętrzny model FHIR (zagnieżdżone zasoby, wszystko opcjonalne) byłby złym modelem relacyjnym dla terminarza i finansów.
**Decyzja.** Model wewnętrzny pozostaje relacyjny i własny (`03-model-domeny.md`), ale każda encja kliniczna i organizacyjna ma **udokumentowane mapowanie na zasób FHIR R4** (tabela w `03`, sekcja 6) i kody ze słowników wymaganych przez CeZ (ICD-10, ICD-9 PL, kod resortowy, NPWZ, FDI jako kod zęba). Pakiet `@crux/interop` zawiera mapery domena→FHIR/CDA i z powrotem (anti-corruption layer) oraz walidację w CI na przykładowych dokumentach. Żaden moduł domenowy nie zna FHIR.
**Konsekwencje.** Model nie dryfuje w stronę niezgodną ze standardami; P1 i EHDS to tylko adaptery. Koszt: dyscyplina przy dodawaniu pól (każde nowe pole kliniczne ma odpowiednik w mapowaniu albo adnotację „lokalne”).
**Alternatywy.** FHIR jako model przechowywania (np. serwer HAPI/Medplum): elastyczne, ale słabe więzy, trudne RLS, gorsza wydajność terminarza.
**Wracamy, gdy** CeZ lub EHDS zmienią standard bazowy.

## ADR-022 · Czas i daty

**Status.** przyjęta
**Decyzja.** `date-fns` v4 z `@date-fns/tz` w jednym helperze `@crux/shared/time` (`TZ = 'Europe/Warsaw'`). W domenie czas przychodzi z `ctx.clock.now()`; `new Date()` jest zabronione poza `packages/shared/time`. Daty kalendarzowe (data urodzenia, dzień grafiku) jako `PlainDate` (`date` w Postgresie, string `YYYY-MM-DD` w TS), chwile jako `timestamptz`. Terminarz operuje na chwilach, wyświetla w strefie gabinetu (wszystkie gabinety w Polsce, ale pole `locations.time_zone` istnieje). Przejście na natywne `Temporal`, gdy osiągnie Baseline w przeglądarkach z `01`, sekcja 13.
**Konsekwencje.** Deterministyczne testy, brak błędów czasu letniego, jedna biblioteka.

## ADR-023 · Tryb offline

**Status.** przyjęta
**Kontekst.** Awaria internetu w gabinecie zatrzymuje recepcję. Silniki local-first (PowerSync, ElectricSQL, Zero) pozwalają pracować offline z synchronizacją do Postgresa, ale wnoszą drugi model uprawnień, dane medyczne na urządzeniach i złożoność konfliktów.
**Decyzja.** F1: PWA z pamięcią podręczną tylko do odczytu (lista dnia, telefony pacjentów z dnia, nic więcej) + łącze zapasowe LTE w każdym gabinecie + procedura papierowa. Zapis offline nie istnieje. **Ocena local-first w F3** z kryteriami: (a) co najmniej 2 incydenty utraty łączności powyżej 30 min w kwartale, (b) silnik wspiera reguły synchronizacji zgodne z RLS per gabinet, (c) szyfrowanie bazy lokalnej na urządzeniu, (d) koszt poniżej kosztu drugiego łącza. Jeśli kryteria spełnione: ADR z wyborem silnika i zakresem (tylko terminarz).
**Konsekwencje.** Prosty F1; świadome ryzyko przestoju ograniczone łączem zapasowym.

## ADR-024 · Warstwa AI za portem `LlmPort`

**Status.** przyjęta (uzupełnia 017)
**Decyzja.** Moduł `@crux/ai` z portem `LlmPort` (uzupełnianie, transkrypcja, osadzenia) i adapterami wymiennymi przez konfigurację. Warunki dla dostawcy: przetwarzanie w UE, DPA z zakazem trenowania na danych, zero retencji promptów po stronie dostawcy; kandydaci oceniani w F6 (np. Azure OpenAI w EU Data Zone, AWS Bedrock Frankfurt, Mistral; wybór po DPA). Zasady: (1) każdy wynik AI jest szkicem z autorem „AI” i wymaga akceptacji człowieka przed zapisem do dokumentacji; (2) prompty i odpowiedzi z danymi pacjenta przechowujemy u siebie, zaszyfrowane (ADR-025), z retencją 30 dni; (3) prompt systemowy i wersja modelu zapisane przy każdym wyniku; (4) ocena jakości na zbiorze testowym przed włączeniem funkcji w gabinecie; (5) żadnych funkcji z ADR-017 „wymaga osobnego ADR” bez tego ADR.
**Konsekwencje.** AI daje się dodać bez dotykania modułów domenowych; granica MDR jest utrzymana.

## ADR-025 · Szyfrowanie aplikacyjne i zarządzanie kluczami

**Status.** przyjęta
**Decyzja.** Szyfrowanie kopertowe w `@crux/shared/crypto`: dane wrażliwe (PESEL, numer dokumentu, skany dokumentów, nagrania, transkrypcje) szyfrowane AES-256-GCM kluczem danych (DEK) per tenant, DEK opakowany kluczem głównym (KEK) w KMS u dostawcy z UE (AWS KMS `eu-central-1` lub OpenBao na serwerze workera; decyzja w F0 po wycenie). Format pola: `enc:v1:<key_id>:<iv>:<ciphertext>`. Wyszukiwanie po PESEL przez `pesel_hmac = HMAC-SHA256(pesel, pepper_tenant)`; `pepper` w KMS. Rotacja DEK raz w roku (nowa wersja klucza, leniwe przeszyfrowanie). Dostęp do KEK tylko z web i workera przez tożsamość maszyny, nigdy z CI. Supabase Vault nie jest magazynem kluczy (klucze byłyby w tej samej jurysdykcji i infrastrukturze co dane).
**Konsekwencje.** Wyciek kopii bazy nie ujawnia PESEL-i ani skanów; dodatkowa zależność (KMS) i narzut na zapis/odczyt pól wrażliwych (akceptowalny: kilka pól na pacjenta).

## ADR-026 · Pliki medyczne w magazynie obiektowym w UE

**Status.** przyjęta (uzupełnia 004)
**Decyzja.** Załączniki do dokumentacji (zdjęcia, skany, PDF zgód i kosztorysów, pliki STL, miniatury DICOM) w magazynie obiektowym zgodnym z S3 u dostawcy z UE (Hetzner Object Storage lub Scaleway; wybór po DPA w F2) za portem `FileStoragePort`. Bucket prywatny, szyfrowanie po stronie serwera, wersjonowanie włączone, blokada usuwania (object lock) dla dokumentacji. Dostęp przez krótkotrwałe podpisane URL (60 s) generowane po `authorize()` i zapisane w logu dostępu. Supabase Storage tylko dla plików niemedycznych. Obrazy DICOM w pełnej rozdzielczości w Orthanc (ADR-028), w magazynie obiektowym ich kopia zapasowa.
**Konsekwencje.** Jeden dostawca mniej w ścieżce medycznej (bez globalnego CDN); kopia zapasowa dokumentów poza Supabase od razu.

## ADR-027 · Analityka: schemat gwiazdy, metryki jako kod, odświeżanie przyrostowe

**Status.** przyjęta
**Decyzja.** Schemat `analytics` w tej samej bazie: tabele faktów (`fact_appointments`, `fact_procedures`, `fact_charges`, `fact_payments`, `fact_plan_items`, `fact_recall_tasks`, `fact_lab_orders`) i wymiary (`dim_date`, `dim_location`, `dim_provider`, `dim_service`, `dim_patient_anon` bez danych osobowych). Zasilanie przez worker: co 5 min przyrostowo dla ostatnich 2 dni (po `updated_at`), nocą pełne przeliczenie 13 miesięcy. Definicje metryk jako kod w `@crux/analytics/metrics/*.ts` (SQL + typ + opis + test na zestawie wzorcowym `golden`), rejestr w `11-dashboardy-i-raporty.md`. Dashboardy czytają wyłącznie z `analytics` przez widoki z RLS wg roli (lekarz widzi swoje; kierownik gabinet; zarząd sieć; grupa tylko agregaty). Osobna hurtownia (np. DuckDB, ClickHouse) dopiero, gdy zapytania przekroczą 2 s p95 przy pełnym obciążeniu.
**Konsekwencje.** Dashboardy w ~200 ms, niezależne od tabel operacyjnych; każda liczba ma SQL, który można pokazać.

## ADR-028 · Obrazowanie: Orthanc + DICOMweb + lokalny agent, podgląd bez diagnostyki

**Status.** przyjęta (uzupełnia 012)
**Decyzja.**
1. W każdym gabinecie **Orthanc** (otwarty serwer PACS, Docker na mini-PC lub NAS) jako cel DICOM C-STORE z Romexis (wymaga pakietu „DICOM Storage” w Romexis; cena do ustalenia z dystrybutorem) oraz jako **Modality Worklist SCP** (lista pacjentów dnia z Crux; Romexis potrzebuje pakietu „DICOM Full” dla Worklist SCU). Orthanc wystawia **DICOMweb** (QIDO-RS, WADO-RS) przez tunel do Crux.
2. Crux (`@crux/imaging`) indeksuje badania (`imaging_studies`, `imaging_series`, `imaging_instances`: identyfikatory, daty, modalność, zęby z opisu, bez pikseli) i pokazuje miniatury oraz podgląd (OHIF lub Stone Web Viewer w trybie podstawowym) z etykietą „podgląd, nie do diagnostyki”, **bez narzędzi pomiarowych, okienkowania diagnostycznego i filtrów** (granica MDR, ADR-017).
3. **Lokalny agent `apps/bridge`** (Node 22 spakowany jako usługa Windows; komponent .NET tylko, jeśli TWAIN lub VDDS tego wymagają): otwieranie pacjenta w Romexis (`DxStart.exe` lub PmBridge DLL), obserwowane foldery skanerów (STL/PLY/OBJ), drukarka fiskalna, token urządzenia z Crux, komunikacja wychodząca (agent łączy się z Crux, nigdy odwrotnie).
4. Kopie badań do magazynu obiektowego w UE (ADR-026) nocą; CBCT (setki MB) zostaje w Orthanc, w chmurze tylko kopia i miniatury.
5. Alternatywa dla sieci: jeden centralny Orthanc w chmurze UE, jeśli łącza gabinetów pozwolą (ocena w F5 na podstawie spisu sprzętu i pomiaru łączy).
**Konsekwencje.** Lekarz widzi badanie w karcie w minutę od wykonania; diagnoza nadal w Romexis; koszty: pakiety DICOM Romexis, mini-PC/NAS per gabinet, praca wdrożeniowa.

## ADR-029 · Strażnicy architektury

**Status.** przyjęta
**Kontekst.** System ma rosnąć przez prompty bez psucia (`10-praca-z-ai.md`). Reguły w dokumentach nie wystarczą, jeśli nic ich nie egzekwuje.
**Decyzja.** Pięć mechanizmów w repo od F0:
1. **Generator modułu i funkcji** (`pnpm gen module <name>`, `pnpm gen usecase <module> <name>`, `pnpm gen screen <route>`): szkielet z `domain/application/infrastructure/index.ts`, testami, migracją, stroną Storybook. AI wypełnia gotowy szkielet.
2. **`crux-doctor`** (`pnpm doctor`, w CI): skanuje repo i bazę testową i zawodzi, gdy: tabela bez RLS lub bez testu pgTAP; przypadek użycia bez `authorize()`; server action powyżej 25 linii; import spoza `index.ts`; `any`, `as unknown as`, `new Date()` w domenie; kolor HEX w `apps/web`; metryka na ekranie bez wpisu w rejestrze; zależność npm bez wpisu w `docs/zaleznosci.md`; nazwa pojęcia spoza słownika (`visit`, `clinic`, `customer`).
3. **`dependency-cruiser`** z grafem dozwolonych zależności z `01`, sekcja 4 (uzupełnia `eslint-plugin-boundaries`) i wizualizacją w CI.
4. **Śledzenie specyfikacji**: każdy test kryterium akceptacji ma w nazwie znacznik `[F1-002/AC3]`; `pnpm doctor` sprawdza, że specyfikacja ze statusem „w realizacji” lub „wdrożona” ma test dla każdego kryterium.
5. **Rejestr promptów** `prompts/ledger.md`: każda zastosowana sesja promptów ma wpis (data, prompt, zakres, commit, wynik). Nowy czat czyta rejestr i wie, co już zrobiono.
**Konsekwencje.** Łamanie reguł jest głośne i automatyczne; narzut na start (tydzień 1–2 F0).

## ADR-030 · Next.js 16: tryb dynamiczny, `proxy.ts`, bez Cache Components do F3

**Status.** przyjęta (uzupełnia 003)
**Kontekst.** [Next.js 16 (21.10.2025)](https://nextjs.org/blog/next-16): Turbopack domyślnie, `cacheComponents` (opcjonalne), `proxy.ts` zamiast `middleware.ts` (Node runtime), React 19.2, Node ≥ 20.9, async `params`/`cookies`/`headers`, `next lint` usunięte, ESLint flat config, `updateTag()`/`refresh()` w server actions.
**Decyzja.** Next.js 16 z Turbopack; `cacheComponents: false` do F3 (wszystko dynamiczne per tenant i aktor; cache per użytkownik byłby ryzykiem wycieku), `reactCompiler: true` po pomiarze czasu builda; `proxy.ts` do sesji i blokady ekranu; `images.remotePatterns` tylko dla własnego magazynu; `output: 'standalone'`; ESLint 9+ flat config + `eslint-plugin-boundaries`; Node 22 LTS. Cache Components rozważymy dla widoków tylko do odczytu w F3 (dashboardy), z kluczem cache zawierającym `tenant_id` i rolę.
**Konsekwencje.** Brak ukrytego cache między użytkownikami; wolniejszy TTFB na ekranach, które i tak muszą być dynamiczne.

## ADR-031 · Pakiet marki jako źródło tokenów, dwie marki w jednym systemie, model kuleczkowy

**Status.** przyjęta (uzupełnia 014)
**Kontekst.** 6 listopada 2026 powstał pakiet marki (`Materialy marki/`, `Crux - dla tworcow aplikacji/`): brandbook zenit 1.0, księga znaku Crux 1.0, `GUIDELINE-APLIKACJI.md` (w repo jako `docs/14`), `tokens.css` + `tokens.json` + preset Tailwind, fonty, logotypy na krzywych, ikony, ryciny, geometria znaku i łuku w JSON, wzorcowe komponenty `CruxLogo.tsx` i `ArchGauge.tsx`, przykłady wykresów. Do tej pory tokeny były spisane w `06`, a znak Crux nie istniał (w pasku bocznym planowano znak zenit kompakt). Pakiet ustala też numerację: 01 Nowodworska (baza), 02 Białowieska; dokumentacja 2.0 miała ją odwrotnie.
**Decyzja.** (1) Tokeny, fonty, logotypy, ryciny i geometria pochodzą z pakietu marki i są kopiowane do `packages/ui/brand/` bez edycji (`pnpm brand:sync`, manifest z sumami, strażnik `ui.brand-sync`); każda zmiana tokena zaczyna się w `Materialy marki/`. Braki uzupełnia `tokens.extra.css` z adnotacją do przeniesienia. (2) Crux ma własny znak (Krzyż Południa) i to on występuje w pasku bocznym, na logowaniu, w ikonie aplikacji i raportach wewnętrznych; **pacjent nigdy nie widzi marki Crux**: dokumenty, SMS, portal i rezerwacja noszą zenit.stomatologia (strażnik `ui.brand-separation`). (3) Model kuleczkowy jest domyślnym językiem wykresów dla wartości z naturalnym 100% i wartości policzalnych (`ArchGauge`, `DotGrid`, `DotPlot`, `DotCalendar`, `Sparkline`, `PartsBar`); forma metryki jest zapisana w rejestrze metryk (`11`, 4.6) i stamtąd trafia na ekran; wykresy kołowe nie istnieją. (4) Numeracja gabinetów: 01 Nowodworska, 02 Białowieska, stała w seedach, testach i dokumentach.
**Konsekwencje.** Jeden punkt prawdy o marce poza repo; spójność między Crux, stroną i portalem; mniej decyzji projektowych przy każdym ekranie; komponenty wykresów wymagają własnej implementacji SVG (poza `LineChart`/`BarList` na Recharts) i porównania ze wzorcami w testach wizualnych; przy sprzeczności `06` i `14` wygrywa `06`, rozbieżności w `06`, sekcja 8.
**Alternatywy.** Tokeny ręcznie w repo (dryf między marką a kodem), jedna marka zenit także w Crux (brak rozróżnienia narzędzia od marki pacjenta), gotowa biblioteka wykresów bez własnych form (wygląd „jak każdy SaaS”).
**Wracamy, gdy** marka zmieni tokeny w sposób, którego Tailwind v4 `@theme` nie odwzoruje, albo model kuleczkowy okaże się nieczytelny w testach z zespołem (wtedy forma wraca do linii/słupków w rejestrze metryk, bez zmiany komponentów).

## ADR-032 · Wydania jako jednostka dostarczania; 1.0 bez danych pacjentów; obłożenie foteli jako moduł wzorcowy

**Status.** przyjęta (zmienia plan z `07` w wersji 2.0)
**Kontekst.** Plan 2.0 zakładał fazę F0 (8 tygodni) kończącą się modułem wzorcowym `lab`, który wymaga danych pacjentów (nazwisko, zęby), a więc opinii prawnej, DPIA i umów powierzenia (tor B, odpowiedzi liczone w tygodniach). Właściciele chcą mieć działający szkielet w gabinetach jak najszybciej, z pomiarem obłożenia foteli (na razie godzinowym, dla 01 i 02), z rolami i dostępami oraz pulpitami zbierającymi dane czasowe i finansowe. Numeracja „fazy” (F0…F6) opisuje zakres, ale nie mówi, co i kiedy trafia do gabinetów; w rozmowach pojawiło się „P1” jako nazwa pierwszej wersji, które koliduje z Platformą P1 i z numeracją promptów.
**Decyzja.** (1) Jednostką dostarczania jest **wydanie** z numerem i nazwą rośliny z zielnika marki; fazy zostają jako porządek specyfikacji i promptów; mapowanie w `07`, sekcja 2. (2) **Wydanie 1.0 „Krasnodrzew” nie przetwarza danych pacjentów**: zawiera fundament (K01–K10), obłożenie godzinowe foteli (F0-010), analitykę i pulpity (F0-011), administrację, obserwowalność i wdrożenie; wchodzi do gabinetów bez czekania na tor B (dane personelu są danymi zwykłymi; `04`, sekcja 5a). (3) **Modułem wzorcowym jest obłożenie foteli** (w planie 2.0 był to `lab`); F0-001 zachowuje identyfikator i przechodzi do wydania 1.1 po kartotece i terminarzu. (4) Obłożenie żyje w tabeli `chair_occupancy` (`03a`, 5.1) jako trwałe źródło metryki `chair_utilization`: w 1.0 wpisy ręczne, od 1.1 wiersze pochodne z wizyt dla gabinetów przełączonych ustawieniem `scheduling.occupancy_mode`; definicja metryki i pulpity nie zmieniają się przy przejściu. Kwoty we wpisach są pomiarem przychodu do czasu 2.0, w którym źródłem stają się należności (`revenue_realized` z polem `since`). (5) Prompty mają identyfikatory `K01`… (K jak krok planu), a „P1” w dokumentach oznacza wyłącznie Platformę P1.
**Konsekwencje.** Wartość i nawyk pracy w Crux w gabinetach od grudnia 2026 zamiast kwietnia 2027; recepcja wpisuje obłożenie obok starego programu (koszt: ≤ 3 minuty dziennie; ryzyko w `07`, sekcja 6); schemat `analytics` i rejestr metryk powstają wcześniej i mniejsze, potem rosną; `lab` czeka na pacjentów; dokumentacja 2.0 wymagała poprawek w kilkunastu plikach (wykonane 6.11.2026, bez „wdów” po starym planie).
**Alternatywy.** F0 jak w planie 2.0 z `lab` i minimalnymi pacjentami (wymaga toru B przed wdrożeniem; wartość dopiero z 1.1); wpisy obłożenia jako wizyty z pustym pacjentem (`appointments.patient_id null`: miesza pomiar z rezerwacją, komplikuje niezmienniki); pomiar w arkuszu zamiast w Crux (brak nawyku, brak jednej definicji, dane nie przechodzą do 1.1).
**Wracamy, gdy** recepcja nie utrzyma wpisów (bramka 1.0 niespełniona po 4 tygodniach): wtedy 1.0 zostaje jako szkielet i administracja, a pomiar obłożenia startuje z wizyt w 1.1.

## ADR-033 · Domeny: Crux na `crux.zenitstomatologia.pl`, strona dla pacjentów na domenie głównej

**Status.** przyjęta
**Kontekst.** Sieć ma domenę `zenitstomatologia.pl` (strona dla pacjentów, marka zenit.stomatologia) i `zenitstomatologia.com` (kupiona wcześniej przez Microsoft 365). Padło pytanie, czy Crux ma żyć pod ścieżką `zenitstomatologia.pl/crux`. Crux to osobna aplikacja (Next.js na Vercel) z sesją w ciasteczkach, MFA, od 1.1 z danymi o zdrowiu; strona dla pacjentów to inny deploy, inna marka, inne tempo zmian i inne skrypty zewnętrzne (mapy, analityka).
**Decyzja.** (1) Produkcja Crux pod **`crux.zenitstomatologia.pl`** (projekt Vercel `crux`, `fra1`), staging pod **`crux-staging.zenitstomatologia.pl`** (Vercel `crux-staging`, chroniony hasłem Vercel), podglądy PR na `*.vercel.app` z ochroną dostępu. (2) Domena główna `zenitstomatologia.pl` (z `www` jako przekierowanie 301) to wyłącznie strona dla pacjentów; `zenitstomatologia.com` przekierowuje 301 na `.pl`. (3) Ciasteczka Crux (`sb-*`, `crux.location`) są ustawiane bez atrybutu `Domain` (host-only), więc nie wyciekają na domenę główną ani na staging; HSTS z `includeSubDomains` na domenie głównej dopiero po sprawdzeniu, że każda subdomena ma TLS. (4) Supabase Auth: `Site URL = https://crux.zenitstomatologia.pl`, lista `Redirect URLs` tylko z `crux.` i `crux-staging.`; bez własnej domeny dla Supabase w 1.0 (przeglądarka nie rozmawia z `*.supabase.co`, bo logowanie idzie przez server actions). (5) Webhooki integracji (SMS, ZnanyLekarz, bramka P1) pod `https://crux.zenitstomatologia.pl/api/webhooks/<dostawca>`; worker bez publicznej domeny (`/healthz` monitorowany z sieci prywatnej lub przez adres z firewallem). (6) Rezerwacja online (1.1) ma być dla pacjenta pod `zenitstomatologia.pl/rezerwacja`: hosting strony przepisuje (rewrite) tę ścieżkę do `(public)/rezerwacja` w `apps/web`; jeśli strona nie będzie na Vercelu i rewrite będzie kłopotliwy, zapasowo `rezerwacja.zenitstomatologia.pl`. Decyzja o wariancie przed K01 wydania 1.1.
**Konsekwencje.** Osobne źródła (origin) = osobna polityka CSP, osobne nagłówki bezpieczeństwa i osobne ciasteczka; XSS na stronie marketingowej nie dotyka sesji Crux. Brak `basePath` w Next.js, więc linki, zasoby, middleware (`proxy.ts`) i przekierowania logowania nie wymagają prefiksu. Strona dla pacjentów może być hostowana gdziekolwiek (także u agencji), bez dotykania Crux. Subdomena `crux.` może być delegowana rekordem CNAME do Vercela bez przenoszenia całej strefy DNS. Marka Crux nie pojawia się na domenie głównej (reguła `ui.brand-separation`). Koszt: trzy rekordy DNS i jeden wpis w Supabase Auth.
**Alternatywy.** Ścieżka `zenitstomatologia.pl/crux` (wspólne ciasteczka i skrypty ze stroną dla pacjentów, `basePath` w całej aplikacji, każdy deploy strony dotyka systemu, jedna polityka CSP dla dwóch różnych potrzeb): odrzucona. Osobna domena (np. `cruxapp.pl`): bez związku z siecią, kolejna domena do odnawiania, kolejny certyfikat, zero korzyści: odrzucona. `app.zenitstomatologia.pl`: neutralna nazwa, ale system nazywa się Crux i tak mówi o nim personel; `app.` zostaje wolne na ewentualny portal pacjenta (5.0).
**Wracamy, gdy** powstanie więcej niż jedna aplikacja wewnętrzna (wtedy wspólne SSO i konwencja `<aplikacja>.zenitstomatologia.pl`) albo gdy sieć zmieni domenę główną (zmiana jest jednym rekordem CNAME i jednym wpisem w Supabase Auth).

---

## Szablon nowej decyzji

```
## ADR-0XX · Tytuł

**Status.** proponowana / przyjęta / zastąpiona przez ADR-0YY / uzupełniona przez ADR-0YY
**Kontekst.** Jaki problem, jakie ograniczenia, co wiemy (ze źródłami, jeśli są).
**Decyzja.** Co wybieramy, konkretnie.
**Konsekwencje.** Co zyskujemy, co tracimy, co trzeba pilnować.
**Alternatywy.** Co odrzuciliśmy i dlaczego.
**Wracamy, gdy** warunek, który unieważnia decyzję.
```
