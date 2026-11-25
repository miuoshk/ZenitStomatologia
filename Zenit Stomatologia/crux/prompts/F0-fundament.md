# F0 · Fundament = wydanie 1.0 „Krasnodrzew”: prompty K01–K17

Wersja 2.1 · 6 listopada 2026. Te 17 promptów, wykonane po kolei, daje **wydanie 1.0** Crux (`docs/07`, sekcja 2): szkielet aplikacji ze wszystkimi strażnikami, logowanie z MFA, role i dostępy, gabinety 01 Nowodworska i 02 Białowieska z fotelami i godzinami, **obłożenie godzinowe foteli** jako moduł wzorcowy, schemat `analytics` z rejestrem metryk, trzy pulpity i ekrany administracji. Wydanie 1.0 **nie przetwarza danych pacjentów** (ADR-032), więc nie czeka na opinię prawną ani DPIA.

Kolejność obowiązuje (zależności w nawiasach przy tytułach). Każdy prompt: najpierw tryb Plan, potem Agent. Po każdym: `ledger.md`, commit. Pełny opis wydania i każdego kroku, z rysunkami: `podrecznik/PODRECZNIK-CRUX-1.0.md`.

| Krok | Co powstaje | Dni robocze |
|---|---|---|
| K01 | monorepo, CI, puste pakiety | 1 |
| K02 | Supabase lokalnie i staging, migracja bazowa, pgTAP | 1 |
| K03 | `@crux/shared`: Result, Money, Id, czas, kryptografia | 1 |
| K04 | `@crux/db`: Drizzle, `withActor`, RLS, harness testów | 1 |
| K05 | `@crux/platform`: audyt, outbox, zdarzenia, flagi, ustawienia | 1 |
| K06 | `@crux/identity` + `@crux/org`: personel, role, gabinety, fotele, godziny | 1–2 |
| K07 | logowanie, MFA, blokada ekranu, powłoka ze znakiem Crux | 1–2 |
| K08 | `@crux/ui`: pakiet marki, komponenty, model kuleczkowy, Storybook | 2 |
| K09 | `apps/worker`: pg-boss, outbox, harmonogramy, kopie | 1 |
| K10 | CI, `crux-doctor`, generatory, dependency-cruiser | 1 |
| K11 | moduł wzorcowy: obłożenie godzinowe foteli (F0-010), 4 części | 3 |
| K12 | fabryki, zestaw wzorcowy, demo | 1 |
| K13 | `@crux/analytics` 1.0: schemat, zasilanie, rejestr metryk | 2 |
| K14 | pulpity 1.0: sieć, gabinet, moje; lista drążenia (F0-011) | 2 |
| K15 | ekrany administracji: organizacja, personel, ustawienia, integracje | 1–2 |
| K16 | obserwowalność bez danych osobowych, procedury operacyjne | 1 |
| K17 | wydanie 1.0: produkcja, konta, instrukcja, bramka | 1 |

---

### K01 · Monorepo i narzędzia  [chore]

**Cel.** Puste, ale kompletne monorepo, w którym każdy kolejny prompt ma gdzie wylądować i co uruchomić.

**Przeczytaj.** `@AGENTS.md`, `@docs/01-architektura.md` (sekcje 1, 4, 5), `@docs/09-konwencje-kodu.md` (sekcje 1, 2, 6, 9), `@docs/02-decyzje-architektoniczne.md` (ADR-001, 002, 029, 030, 032).

**Zakres.** Katalog główny, `apps/web`, `apps/worker`, `packages/{shared,db,ui,i18n,testing,config}`, `packages/modules/{platform,identity,org,scheduling,analytics,integrations}` (puste szkielety z `package.json` i `index.ts`), `tools/{doctor,gen}` (puste), `.github/workflows/ci.yml` (szkielet), `.cursor/rules/` (skopiuj z folderu projektu bez zmian), `docs/` (skopiuj), `prompts/` (skopiuj), `podrecznik/` (skopiuj).

**Kroki.**
1. `pnpm` workspaces (`pnpm-workspace.yaml`: `apps/*`, `packages/*`, `packages/modules/*`, `tools/*`), Turborepo (`turbo.json` z zadaniami `build`, `typecheck`, `lint`, `test`, `test:db`, `e2e`, `doctor`), `.nvmrc` = `22`, `.npmrc` z `save-exact=true`, `.editorconfig`, `.gitignore`, `.gitattributes`.
2. `packages/config`: `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: bundler`, `target: ES2022`), `eslint.config.base.js` (flat config: `typescript-eslint` strict-type-checked, `eslint-plugin-boundaries` z elementami `app`, `module-domain`, `module-application`, `module-infrastructure`, `module-public`, `package`, reguły z `docs/09`, sekcja 6; `no-restricted-syntax` dla `new Date()` poza `packages/shared/time`; `no-restricted-imports` dla ścieżek `packages/modules/*/src/**`), `prettier.config.js`, `dependency-cruiser.cjs` z grafem z `docs/01`, sekcja 4 (na razie `platform`, `identity`, `org`, `scheduling`, `analytics`, `integrations`).
3. `apps/web`: `create-next-app`-równoważny szkielet Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack), `next.config.ts` z `output: 'standalone'`, `cacheComponents: false`, `reactCompiler: false` (włączymy po pomiarze), `images.remotePatterns: []`; `proxy.ts` pusty z komentarzem; strona `/` z tekstem „crux”; Dockerfile (multi-stage, standalone).
4. `apps/worker`: `src/main.ts` z „hello”, `tsup` lub `tsx` do uruchomienia, Dockerfile.
5. Każdy pakiet: `package.json` (`name: @crux/<nazwa>`, `type: module`, `exports` tylko `./src/index.ts`), `tsconfig.json` rozszerzający bazę, `src/index.ts`.
6. Skrypty główne: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest workspace), `pnpm test:db` (na razie `echo "no db tests yet" && exit 0`), `pnpm doctor` (na razie `echo skip`), `pnpm e2e` (Playwright, pusty test dymny na `/`).
7. `.github/workflows/ci.yml`: Node 22, pnpm cache, `pnpm install --frozen-lockfile`, `typecheck`, `lint`, `test`, `test:db`, `doctor`, `e2e` (w CI z `playwright install --with-deps chromium`).
8. `README.md` repo: 10 linii (co to, jak uruchomić, link do `docs/` i `podrecznik/`).

**Ograniczenia.** Nie instaluj niczego poza: `next`, `react`, `react-dom`, `typescript`, `@types/*`, `eslint` + `typescript-eslint` + `eslint-plugin-boundaries` + `eslint-plugin-import-x`, `prettier`, `turbo`, `vitest`, `@vitest/coverage-v8`, `playwright`, `@playwright/test`, `tsx`, `tsup`, `dependency-cruiser`, `tailwindcss`, `@tailwindcss/postcss`. Każda inna zależność: zatrzymaj się. Wersje: najnowsze stabilne, przypięte dokładnie. Utwórz `docs/zaleznosci.md` z tabelą (pakiet, po co, licencja, dane pacjentów: nie).

**Sprawdzenie.** `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` zielone lokalnie; `pnpm build` dla `apps/web` i `apps/worker` przechodzi; `docker build` obu aplikacji przechodzi.

**Zatrzymaj się, gdy.** Next.js 16 wymaga wersji Node innej niż 22; `eslint-plugin-boundaries` nie wspiera flat config w zainstalowanej wersji (wtedy zaproponuj alternatywę i czekaj na decyzję).

---

### K02 · Supabase lokalnie i staging, migracja bazowa  [security]

**Cel.** Lokalna baza z rozszerzeniami, schematami, rolami i funkcjami claims; staging w osobnej organizacji; pierwszy test pgTAP.

**Przeczytaj.** `@docs/03a-schemat-bazy.md` (sekcja 0), `@docs/02-decyzje-architektoniczne.md` (ADR-004, 005, 007, 020), `@docs/09-konwencje-kodu.md` (sekcja 4), `@.cursor/rules/20-database.mdc`.

**Zakres.** `supabase/` (`config.toml`, `migrations/`, `tests/`, `seed.sql`), `packages/db/package.json` (skrypty), `.env.example`.

**Kroki.**
1. `supabase init`; w `config.toml`: `[api] enabled = false` dla lokalnego (produkcyjne wyłączenie Data API zrobimy w panelu i zapiszemy w `docs/ops/supabase-konfiguracja.md`), `[realtime] enabled = false`, `[storage] enabled = true` (bucket `assets` tylko), `[auth]` z `enable_signup = false`, MFA TOTP włączone, `jwt_expiry = 43200` (12 h), `[db] major_version = 17`.
2. Migracja `0001_foundation.sql` (ręczna): rozszerzenia (`btree_gist`, `pg_trgm`, `pgcrypto`, `unaccent`), schematy (`ref`, `audit`, `platform`, `analytics`, `pgboss`), funkcja `extensions.uuid_generate_v7()` (implementacja oparta na `gen_random_uuid` + znacznik czasu ms zgodnie z RFC 9562), funkcje `auth.tenant_id()`, `auth.staff_id()`, `auth.location_ids()`, `auth.role()`, `auth.has_permission(text)` czytające `request.jwt.claims` (bezpieczne przy braku claims: zwracają `null`/`false`), role `crux_app` (LOGIN, `in role authenticated`, bez `bypassrls`) i `crux_worker` (LOGIN, osobna rola, `nobypassrls`; polityki dla workera dodamy per tabela), `grant usage` na schematach, `alter default privileges` tak, by `authenticated` dostawał `select, insert, update` na nowych tabelach w `public` (a `delete` nie), `revoke all on schema audit from authenticated` poza `insert` przez trigger `security definer` (dodany w K05).
3. Migracja `0002_pgtap.sql`: `create extension pgtap`; `supabase/tests/helpers.sql`: schemat `tests` z funkcjami `tests.create_tenant(name)`, `tests.create_location(tenant, number)`, `tests.create_staff(tenant, role, locations[])`, `tests.authenticate_as(staff_id)` (ustawia `role authenticated` i `request.jwt.claims` tak samo jak `withActor`), `tests.tenant_a()`, `tests.tenant_b()`, `tests.location(number)`; test `supabase/tests/000_foundation.sql` sprawdzający, że funkcje `auth.*` zwracają wartości z claims i `null` bez nich.
4. Skrypty w `packages/db/package.json`: `db:start` (`supabase start`), `db:reset`, `db:test` (`supabase test db`), `db:diff`, `db:push:staging` (z `--linked`, tylko ręcznie), `db:types` (generowanie typów do `packages/db/src/generated/`).
5. `.env.example`: `DATABASE_URL` (crux_app, port 6543 transakcyjny), `DATABASE_URL_WORKER` (port 5432 sesyjny), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (do Auth w przeglądarce), `KMS_*` (puste do K03), `FAKE_INTEGRATIONS=1`.
6. Dokument `docs/ops/supabase-konfiguracja.md`: lista kontrolna dla projektu stagingowego i produkcyjnego: organizacja „Zenit Stomatologia”, region `eu-central-1`, plan Pro + PITR, Data API off, Realtime off, parametry logów, MFA do panelu, role per projekt, `pgaudit`, `pg_cron` włączone, kopie.

**Ograniczenia.** Żadnej tabeli domenowej w tej migracji. Żadnego `service_role` w kodzie. Nie używaj `supabase-js` po stronie serwera.

**Sprawdzenie.** `pnpm db:start && pnpm db:reset && pnpm db:test` zielone; `psql` jako `crux_app` nie może `set role postgres`; `select auth.tenant_id()` bez claims zwraca `null`.

**Zatrzymaj się, gdy.** Supabase CLI nie pozwala wyłączyć Data API lokalnie w zainstalowanej wersji (wtedy zostaw włączone lokalnie, ale dodaj do listy kontrolnej produkcyjnej i do `doctor` regułę: żaden schemat nie jest eksponowany w `config.toml` `[api].schemas`).

---

### K03 · `packages/shared`: Result, Money, Id, czas, kryptografia, błędy  [security]

**Cel.** Wspólne typy wartości, z których korzysta każda domena; deterministyczny czas; szyfrowanie kopertowe za portem.

**Przeczytaj.** `@docs/09-konwencje-kodu.md` (sekcja 3), `@docs/02-decyzje-architektoniczne.md` (ADR-007, 022, 025), `@AGENTS.md`.

**Zakres.** `packages/shared/src/**`.

**Kroki.**
1. `result.ts`: `Result<T, E>` (`ok`, `err`, `isOk`, `map`, `andThen`, `unwrapOr`), `DomainError` jako unia dyskryminowana z polem `type` i opcjonalnym `details` bez danych osobowych; `TechnicalError` dla awarii.
2. `money.ts`: `Money` (grosze `bigint`, waluta `PLN`): `fromGrosze`, `fromPln('120.50')`, `add`, `subtract`, `multiply(percent)` z zaokrągleniem bankowym udokumentowanym w teście, `allocate(ratios)` (podział bez gubienia grosza), `format()` → `1 234,50 zł`, `formatShort()` → `412 tys. zł` / `1,2 mln zł` (do kafli), serializacja do string w JSON; żadnych `number` w API publicznym poza `toGroszeNumber()` z komentarzem „tylko do prezentacji”.
3. `id.ts`: `Id` (branded string), `newId()` (UUIDv7, pakiet `uuidv7`), schemat Zod `Id`.
4. `time.ts`: `Clock` (`now(): Date`), `SystemClock`, `FixedClock` do testów; `TZ = 'Europe/Warsaw'`; funkcje `toLocalDay(date)`, `startOfDayIn(tz, day)`, `hourRange(day, hour)` (zwraca `tstzrange` pełnej godziny lokalnej z poprawnym czasem letnim), `formatDateTimePl`, `formatDatePl` (`14.02.2027`), `formatTimePl`, `formatPercent` (`82%`), `PlainDate` (string `YYYY-MM-DD` z walidacją); na `date-fns` v4 + `@date-fns/tz`; eksportuj tylko te funkcje; żadnego `new Date()` poza tym plikiem (reguła ESLint z K01 ma wyjątek dla `packages/shared/src/time.ts`).
5. `crypto.ts`: port `KeyProvider` (`getDek(tenantId, keyId)`, `currentKeyId(tenantId)`), implementacja `LocalKeyProvider` dla środowiska lokalnego (klucze z `.env`, oznaczone jako NIE-produkcyjne), `encryptField(plaintext, tenantId)` → `enc:v1:<keyId>:<ivB64>:<ctB64>` (AES-256-GCM, `node:crypto`), `decryptField`, `hmacField(value, tenantId)` (HMAC-SHA256 z pepperem z `KeyProvider`); `normalizePesel`, `validatePesel` (suma kontrolna, data urodzenia, płeć) w `pesel.ts` (używane od 1.1, ale testowane już teraz).
6. `errors.ts`: mapowanie błędów Postgresa (`23505` unique, `23P01` exclusion, `42501` RLS) na `DomainError` typy `conflict`, `forbidden`.
7. `pii.ts`: `containsPii(text)` wykrywający wzorce PESEL (11 cyfr z poprawną sumą), numeru telefonu (`+48` lub 9 cyfr) i adresu e-mail; używane przez walidatory notatek, których nie wolno zasilać danymi pacjenta (K11, AC7) i przez logger (K16).
8. Testy jednostkowe dla wszystkiego, w tym: `Money.allocate([1,1,1])` dla 100 groszy daje 34/33/33; `validatePesel` na znanych poprawnych i błędnych numerach (syntetycznych, z generatora w teście); czas letni: `startOfDayIn` dla 2027-03-28 i `hourRange` dla godziny 2:00 w dniu zmiany czasu; `containsPii` na 20 przykładach.

**Ograniczenia.** Zależności: `zod`, `uuidv7`, `date-fns`, `@date-fns/tz`. Nic więcej. Wpisz je do `docs/zaleznosci.md`.

**Sprawdzenie.** `pnpm test --filter @crux/shared` zielone, pokrycie ≥ 90% dla `money`, `pesel`, `crypto`, `pii`.

**Zatrzymaj się, gdy.** Chcesz użyć `number` dla pieniędzy gdziekolwiek; chcesz dodać bibliotekę kryptograficzną poza `node:crypto`.

---

### K04 · `packages/db`: Drizzle, `withActor`, RLS, harness testów  [security]

**Cel.** Jedyny sposób dostępu do bazy z kodu: transakcja z ustawionymi claims.

**Przeczytaj.** `@docs/02-decyzje-architektoniczne.md` (ADR-005, 020), `@docs/03a-schemat-bazy.md` (sekcja 0), `@docs/01-architektura.md` (sekcja 9), `@docs/09-konwencje-kodu.md` (sekcja 4).

**Zakres.** `packages/db/src/**`, `drizzle.config.ts`.

**Kroki.**
1. Klient: `postgres` (postgres.js) + `drizzle-orm`; `createDb(url, { role: 'app' | 'worker' })`; pula z `max` 10 (web) / 5 (worker); `prepare: false` dla trybu transakcyjnego Supavisor.
2. `Actor` typ: `{ staffId, tenantId, locationIds, activeLocationId, role, permissions }`. `withActor(db, actor, fn)`: `BEGIN`; `set local role authenticated`; `select set_config('request.jwt.claims', $1, true)` z JSON claims; `set local statement_timeout = '15s'`; wykonuje `fn(tx)`; `COMMIT`/`ROLLBACK`; mapuje błędy Postgresa przez `@crux/shared/errors`.
3. `withWorker(db, fn)`: jak wyżej, rola `crux_worker`, claims `{ worker: true, operation: '<nazwa>' }`; każde wywołanie wymaga nazwy operacji z listy `privileged.ts` (lista przekazywana przy tworzeniu klienta).
4. Schemat Drizzle: `src/schema/index.ts` eksportujący schematy modułów; helpery `tenantColumns()` (`id`, `tenantId`, `createdAt`, `createdBy`), `mutableColumns()` (`updatedAt`, `updatedBy`), `rls.tenantAll(table)`, `rls.tenantLocation(table)`, `rls.appendOnly(table)`, `rls.selfOrManager(table, col)` generujące `pgPolicy` zgodnie z wzorcami z `03a`, sekcja 0; `tableComment(table, { rls, appendOnly, retention })`.
5. Migracje: `drizzle.config.ts` z `out: supabase/migrations`, `schema: packages/db/src/schema`, `migrations.prefix: 'timestamp'`; skrypt `pnpm db:generate`; dokument `packages/db/README.md` opisujący, jak dołożyć migrację ręczną (`manual_`) i jak nie edytować starych.
6. Harness testów integracyjnych: `packages/db/src/testing/`: `createTestDb()` łączący się z lokalnym Supabase, `withTestTenant()` tworzący tenant A i B, gabinety 01/02, personel każdej roli (przez `tests.*` z K02), `actorFor(staff)`; `resetBetweenTests()` (truncate tabel z listy, `restart identity`).
7. Test: `withActor` ustawia claims (odczyt `auth.tenant_id()` w transakcji zwraca tenant aktora) i czyści je po transakcji; `withWorker` z nieznaną operacją rzuca.

**Ograniczenia.** Zero `service_role`. Zero `supabase-js` po stronie serwera. Drizzle `pgPolicy` dla każdej polityki (SQL ręczny tylko dla funkcji/triggerów).

**Sprawdzenie.** `pnpm test --filter @crux/db` (integracyjne, wymaga `pnpm db:start`), `pnpm db:generate` nie generuje różnic na pustym schemacie.

**Zatrzymaj się, gdy.** Drizzle w zainstalowanej wersji nie wspiera `pgPolicy` lub `EXCLUDE` (wtedy: polityki i więzy w migracjach ręcznych `manual_`, a w schemacie tylko komentarz; zapisz jako dług).

---

### K05 · `@crux/platform`: audyt, log dostępu, outbox, zdarzenia, flagi, ustawienia  [security]

**Cel.** Mechanizmy przekrojowe, od których zależą wszystkie moduły.

**Przeczytaj.** `@docs/03a-schemat-bazy.md` (sekcja 1), `@docs/01-architektura.md` (sekcje 6, 9–11), `@docs/04-prawo-i-bezpieczenstwo.md` (sekcja 6), `@docs/02-decyzje-architektoniczne.md` (ADR-008, 009).

**Zakres.** `packages/modules/platform/**`, migracje tabel z sekcji 1 `03a`, testy pgTAP.

**Kroki.**
1. Migracja: `platform.outbox`, `platform.command_log`, `platform.feature_flags`, `platform.settings`, `audit.events`, `audit.access_log`, `audit.integrity_checks` dokładnie jak w `03a` (klucze złożone z `coalesce` zrealizuj przez kolumny generowane lub unikalne indeksy częściowe). Funkcja `audit.track()` (`security definer`, właściciel `postgres`, `search_path` pusty) zapisująca `before`/`after` jako `jsonb` z **usunięciem kolumn wrażliwych** (lista: `pesel_enc`, `pesel_hmac`, `id_document_enc`, `*_enc`) i `reason` z `current_setting('crux.reason', true)`; funkcja `platform.set_reason(text)`. RLS: `audit.events` select tylko dla `auth.has_permission('audit.read')`; `audit.access_log` insert przez funkcję `audit.log_access(...)` (`security definer`), select dla `audit.read`; `outbox`/`command_log` select/insert dla tenanta; `feature_flags`/`settings` select dla tenanta, update dla `settings.manage`.
2. Domena/aplikacja: `publishEvent(tx, topic, payload, { dedupeKey })` z walidacją payloadu schematem zdarzenia z rejestru `events/registry.ts` (każde zdarzenie: nazwa z wersją, schemat Zod zawierający tylko identyfikatory); `recordCommand`/`findCommand`; `logAccess(tx, actor, { patientId, resource, resourceId, action, justification })`; `isEnabled(flag, { tenantId, locationId })`; `getSetting`/`setSetting` z walidacją per klucz (rejestr kluczy w `settings/keys.ts`; pierwsze klucze: `scheduling.occupancy_mode` per gabinet, wartości `manual` | `appointments`, domyślnie `manual`; `ui.default_location`; `analytics.targets.chair_utilization` per gabinet).
3. `domain/events.ts`: typy bazowe `DomainEvent<TName, TPayload>`; `apps/worker` będzie konsumował (K09).
4. Testy pgTAP: trigger audytu zapisuje `before`/`after` bez pól `*_enc`; `authenticated` nie może `update`/`delete` w `audit.*`; izolacja tenantów w `outbox`.
5. Testy integracyjne: `publishEvent` z nieznanym tematem rzuca; `dedupeKey` powtórzony nie tworzy drugiego wiersza; `logAccess` zapisuje `ip_hash` (tylko HMAC adresu); `setSetting` odrzuca wartość spoza schematu klucza.

**Ograniczenia.** Payload outboxa: tylko identyfikatory (test sprawdza, że schematy zdarzeń nie mają pól o nazwach `name`, `phone`, `pesel`, `email`, `content`).

**Sprawdzenie.** `pnpm test --filter @crux/platform && pnpm db:test`.

**Zatrzymaj się, gdy.** Potrzebujesz `security definer` w miejscu innym niż `audit.track()` i `audit.log_access()`.

---

### K06 · `@crux/identity` i `@crux/org`: personel, role, uprawnienia, tenanci, gabinety, fotele  [security]

**Cel.** Model organizacji i uprawnień; `authorize()`; claims budowane z członkostw.

**Przeczytaj.** `@docs/03a-schemat-bazy.md` (sekcje 2–3), `@docs/03-model-domeny.md` (sekcje 1, 3), `@docs/01-architektura.md` (sekcje 7–9), `@docs/04-prawo-i-bezpieczenstwo.md` (sekcja 6 „Dostęp”), `@docs/specs/F0-010-oblozenie-godzinowe.md` (sekcja „Uprawnienia”).

**Zakres.** `packages/modules/identity/**`, `packages/modules/org/**`, migracje, pgTAP, seed uprawnień.

**Kroki.**
1. Migracja `org`: `tenants`, `locations`, `chairs`, `opening_hours`, `opening_exceptions` (z `03a`). RLS: `tenants` select własnego; reszta `tenant_all` (konfiguracja widoczna dla całego tenanta), update tylko `org.manage`.
2. Migracja `identity`: `staff_role` enum, `staff_members`, `memberships`, `permissions`, `role_permissions`, `provider_capabilities`, `break_glass_requests`. RLS: `staff_members` select dla tenanta, update własnego rekordu (ograniczone kolumny przez widok) lub `staff.manage`; `memberships` select dla tenanta, insert/update `staff.manage`; `break_glass_requests` insert dla `dentist`/`location_manager`, select `audit.read`.
3. Seed uprawnień: `identity/src/permissions.ts` (lista startowa: `org.manage`, `staff.manage`, `settings.manage`, `audit.read`, `patient.read`, `patient.write`, `patient.merge`, `appointment.read`, `appointment.create`, `appointment.move`, `appointment.cancel`, `appointment.override_hours`, `occupancy.read`, `occupancy.write`, `occupancy.write_own`, `occupancy.void`, `occupancy.close_day`, `occupancy.write_closed`, `occupancy.override_hours`, `lab_order.read`, `lab_order.write`, `lab_order.cost`, `network.view`, `analytics.view_self`, `analytics.view_location`, `analytics.view_network`, `analytics.export`, `integrations.manage`) i macierz `role_permissions` jako migracja danych (`manual_`) zgodnie z macierzą w `docs/03`, sekcja 8; `authorize(actor, permission, scope?)` sprawdza uprawnienie w claims i, gdy `scope.locationId`, członkostwo w gabinecie (chyba że `network.view`); zwraca `err({ type: 'forbidden' })` i zapisuje nieudaną próbę do `audit.events` (akcja `forbidden`).
4. `buildClaims(tx, authUserId, activeLocationId)`: pobiera `staff_member`, aktywne `memberships` (`ends_on` null lub ≥ dziś), rolę w aktywnym gabinecie, sumę uprawnień ról (`role_permissions`) → `Actor`.
5. Przypadki użycia: `createStaffMember`, `inviteStaffMember` (tworzy konto w Supabase Auth przez `AuthAdminPort` z hasłem jednorazowym do zmiany przy pierwszym logowaniu; w 1.0 bez e-maila zapraszającego, link przekazuje administrator), `deactivateStaffMember`, `assignMembership`, `endMembership`, `setProviderCapabilities`, `requestBreakGlass`; `org`: `createTenant` (tworzy też DEK przez `KeyProvider`), `createLocation` (walidacja numeru `^\d{2}$`, unikalność, `color_key` z puli), `updateLocation`, `createChair`, `updateChair` (nazwa, kolejność, wyposażenie, `active`), `setOpeningHours`, `setOpeningException`; zapytania `listLocations`, `listChairs(locationId)`, `getOpeningHours(locationId, day)` (uwzględnia wyjątki), `listStaff(filters)`.
6. Testy pgTAP: pracownik 01 bez członkostwa w 02 nie widzi `memberships` z 02 (dla tabel operacyjnych; konfiguracja gabinetów jest widoczna); tenant B nic nie widzi. Testy integracyjne: `authorize` odrzuca brak uprawnienia i zapisuje audyt; `buildClaims` nie uwzględnia członkostwa zakończonego; `createLocation('1')` odrzucone.

**Ograniczenia.** Uprawnienia to dane; nie twórz `if (role === 'dentist')` poza `buildClaims`. Konta imienne: `staff_members.email` unikalny w tenancie.

**Sprawdzenie.** `pnpm test --filter @crux/identity --filter @crux/org && pnpm db:test && pnpm doctor`.

**Zatrzymaj się, gdy.** Chcesz dodać rolę spoza enumu lub uprawnienie spoza listy bez wpisu w `docs/03`.

---

### K07 · Logowanie, MFA, sesja, blokada ekranu, powłoka  [security]

**Cel.** Personel loguje się bezpiecznie, wybiera gabinet i widzi powłokę aplikacji ze znakiem Crux.

**Przeczytaj.** `@docs/02-decyzje-architektoniczne.md` (ADR-010, 030), `@docs/06-design-system.md` (sekcje 3–5), `@docs/14-guideline-aplikacji.md` (sekcje 1, 3), `@docs/04` (sekcja 6 „Dostęp”), `@.cursor/rules/30-ui.mdc`.

**Zakres.** `apps/web/app/(auth)/**`, `apps/web/server/{auth.ts,with-actor.ts,action-result.ts}`, `apps/web/proxy.ts`, `apps/web/app/(app)/layout.tsx`, `packages/ui` (tylko użycie; komponenty powstają w K08, więc **wykonaj K08 przed krokami 5–6** albo użyj tymczasowych komponentów oznaczonych `// TODO(K08)` i zamień je w K08).

**Kroki.**
1. `AuthPort` w `@crux/identity/ports` (`signInWithPassword`, `verifyTotp`, `enrollTotp`, `getSession`, `signOut`, `changePassword`); adapter Supabase Auth (`@supabase/ssr` tylko w przeglądarce i w cienkiej warstwie serwera do odczytu sesji; dostęp do danych nadal przez Drizzle).
2. `requireActor()`: odczyt sesji Supabase (cookie), weryfikacja JWT, `buildClaims` dla `auth_user_id` i aktywnego gabinetu z cookie `crux.location`; brak sesji → przekierowanie do `/logowanie`; brak MFA zweryfikowanego w sesji (`aal2`) → `/logowanie/mfa`; pierwsze logowanie → wymuszona zmiana hasła i rejestracja TOTP.
3. Ekrany: `/logowanie` (e-mail + hasło; butelkowe tło, `crux-poziomy-krem.svg` 58 px, rycina `szalwia.svg` w kolorze kremu obok, jedyna animacja znaku: gwiazdy od najjaśniejszej, Ginan ostatni, ≤ 600 ms, wyłączona przy `prefers-reduced-motion`), `/logowanie/mfa` (kod TOTP, pierwsza rejestracja TOTP z QR), `/zablokowany` (blokada ekranu: hasło lub TOTP odblokowuje bez utraty stanu strony; włączana po 5 min bezczynności z `proxy.ts` + licznik po stronie klienta), wylogowanie.
4. `proxy.ts`: nagłówki bezpieczeństwa (CSP bez `unsafe-inline` poza `nonce`, HSTS, `X-Frame-Options`), przekierowania sesji, `request_id` do logów.
5. `(app)/layout.tsx` z `AppShell`: pasek boczny 232 px (zwijany do 64) ze znakiem Crux (`crux-poziomy-krem.svg` 28 px, po zwinięciu `crux-znak-krem.svg`), `LocationSwitcher` (zmiana gabinetu = cookie + `refresh()`; „01 Nowodworska”, „02 Białowieska”, „cała sieć” dla `network.view`), nawigacja wg uprawnień i flag (w 1.0: Obłożenie, Pulpit, Ustawienia; pozycje Dziś, Terminarz, Pacjenci, Plany leczenia, Finanse, Laboratorium, Recall pojawiają się po włączeniu flag w kolejnych wydaniach, nie są renderowane jako „wkrótce”), górny pasek z `CommandPalette` (`Ctrl+K`: przejdź do ekranu, zmień gabinet, skocz do dnia; od 1.1 także wyszukiwanie pacjenta), użytkownik, przycisk blokady; `<head>`: favicon i manifest z `crux/ikony/`, `<title>` „crux · zenit.stomatologia”.
6. `toActionResult(result)` mapujący `DomainError.type` na teksty z `packages/i18n/pl/errors.ts`.
7. Strona „O Crux” (`/ustawienia/o-crux`): wersja z `package.json`, nazwa wydania („1.0 Krasnodrzew”) i jego rycina `brand/ryciny/krasnodrzew.svg` w kolorze mchu, data wdrożenia, link do podręcznika; jedyne miejsce poza pustymi stanami i logowaniem, gdzie pojawia się rycina (`docs/06`, 3.3).
8. e2e Playwright: logowanie → MFA → powłoka; blokada po bezczynności (z nadpisanym czasem przez zmienną testową); użytkownik bez członkostwa w 02 nie widzi 02 w przełączniku; pierwsze logowanie wymusza zmianę hasła.

**Ograniczenia.** Żadnych danych pacjenta na ekranach tego wydania. Hasła nigdy w logach (test: logger ma listę dozwolonych pól). Zależności: `@supabase/supabase-js`, `@supabase/ssr`, `qrcode` (do TOTP) — wpis do `docs/zaleznosci.md`.

**Sprawdzenie.** `pnpm e2e` zielone; `pnpm doctor` bez `service_role` w `apps/web`.

**Zatrzymaj się, gdy.** Supabase Auth MFA wymaga Data API/`supabase-js` w sposób, którego nie da się ograniczyć do Auth (opisz dokładnie, czego wymaga).

---

### K08 · `packages/ui`: pakiet marki, komponenty, model kuleczkowy, Storybook  [ui]

**Cel.** Design system w kodzie, zanim powstanie pierwszy ekran domenowy; wykresy marki gotowe na pulpity 1.0.

**Przeczytaj.** `@docs/06-design-system.md` (całość), `@docs/14-guideline-aplikacji.md` (całość), `@design/crux-dashboard-prototyp.html`, `@.cursor/rules/30-ui.mdc`, `@docs/02` (ADR-014, 031). Pakiet marki: folder `Materialy marki/` i `Crux - dla tworcow aplikacji/` (dysk „Zenit Stomatologia”); jeśli nie ma go w repo, zatrzymaj się i poproś o skopiowanie do `packages/ui/brand/`.

**Zakres.** `packages/ui/**`, `packages/config/tailwind-preset.ts`.

**Kroki.**
1. `brand/`: skopiuj 1:1 z `Materialy marki/`: `tokeny/tokens.css` → `brand/tokens.css`, `tokeny/zenit-theme.tailwind.css` → `brand/zenit-theme.tailwind.css`, `font/*.ttf` + `LICENCJA.txt` → `brand/fonts/`, `crux/logo/**` i `zenit/logo/**` → `brand/logo/{crux,zenit}/`, `ryciny-kohler/svg/*` i `svg-48px/*` → `brand/ryciny/` i `brand/ryciny-48/` (42 tablice, `currentColor`; kolor nadaje CSS); z `Crux - dla tworcow aplikacji/geometria/`: `crux-geometria.json` → `src/brand/crux-geometry.json`, `luk-geometria.json` → `src/charts/arch-geometry.json`; `wykresy-przyklady/*.svg` → `src/charts/__reference__/`. Nie edytuj tych plików (tokeny mają już `--zenit-*`, `--surface-*`, `--text-*`, `--status-*`, `--dane-gabinet-*`, `--dane-skala-*`, `--kolornik-*`, `--radius-*`, `--space-*` i `[data-theme="dark"]`); brakujące tokeny (np. `--dane-kulka-pusta`, `06` sekcja 8) dopisz w osobnym pliku `src/tokens.extra.css` z komentarzem „do przeniesienia do Materialy marki”. `brand/README.md`: skąd pochodzą pliki i jak je odświeżyć (`pnpm brand:sync <ścieżka>` kopiuje i liczy sumy kontrolne do `brand/manifest.json`; `crux-doctor ui.brand-sync` porównuje). Licencja fontu (SIL OFL) w `docs/zaleznosci.md`.
2. `tailwind-preset.ts` (Tailwind v4 `@theme` przez CSS, preset mapujący kolory na zmienne; **bez** wartości HEX w klasach); reguła ESLint w `apps/web` zabraniająca `bg-[#…]` i `text-[#…]` (`crux-doctor` też to sprawdza).
3. Komponenty z inwentarza `06`, sekcja 4, w zakresie 1.0: `CruxLogo` (z `crux-geometry.json`, `currentColor`, Ginan w bursztynie; wzorzec `Crux - dla tworcow aplikacji/komponenty/CruxLogo.tsx`), `ZenitLogo` (wrapper na pliki SVG, tylko do dokumentów i portalu), `Num` (format polski, `tabular-nums`, `aria-label`), `AppShell`, `CommandPalette`, `LocationChip`, `LocationSwitcher`, `Button`, `Input`, `Select`, `Combobox`, `DatePicker`, `TimePicker`, `PhoneInput`, `PeselInput`, `SegmentedControl`, `ChipToggle`, `DataTable`, `KpiTile` (anatomia z `06`, 4.1), `DeltaBadge`, `Card`, `CardHeader`, `ChartCard` (anatomia z `06`, 4.2: tytuł mówiący, co widać, podpowiedź z definicją, legenda z `LocationChip`, przełącznik Wykres/Tabela z `TableView`, stopka z zakresem i `refreshed_at`, ładowanie przez przyciemnienie), `FilterBar` (kontrakt URL z `docs/11`, sekcja 3), `StatusPill`, `SidePanel`, `Dialog`, `ConfirmDialog` (z polem powodu), `Toast`, `EmptyState` (z rycinami z `brand/ryciny/` jako komponenty SVG), `HourGrid` (siatka godzin × kolumn z nawigacją klawiaturą i polem fokusu; bez logiki domenowej; używana przez obłożenie w K11 i w 1.1 przez widok tygodnia). Prymitywy Radix skopiowane i przestylowane (bez domyślnego wyglądu shadcn).
4. `src/charts/`: komplet modelu kuleczkowego i wykresów z `06`, sekcja 6: `ArchGauge` (łuk z `arch-geometry.json`, prop `width` domyślnie 220, `value` 0–1, `filled = Math.round(value * 16)`, liczba w łuku; wzorzec `komponenty/ArchGauge.tsx`), `DotGrid`, `DotPlot`, `DotCalendar`, `Sparkline`, `PartsBar`, `LineChart` (Recharts z motywem: siatka `--grid` 1 px, linie 2 px z zaokrąglonymi końcami, etykiety końców linii z rozsuwaniem kolizji, linia celu przerywana `3 3` podpisana „cel”, linia odniesienia patyna 1 px, tooltip przy najechaniu i fokusie z wartością pogrubioną przed nazwą serii, celownik, strzałki ←/→ po punktach), `BarList` (poziome słupki ze skali zieleni, zaokrąglenie 4 px tylko na końcu z danymi, próbka kolornika przy etykiecie; `variant="funnel"`). Każdy: `role="img"` z opisem, `TableView`, porównanie wizualne ze wzorcem z `__reference__/`.
5. Storybook (najnowszy stabilny, Vite builder) z historią dla każdego komponentu: warianty, stan fokusu, motyw ciemny, iPad (viewport 1024×768) i test dostępności (`@storybook/addon-a11y`).
6. Testy wizualne: `@storybook/test-runner` + zrzuty Playwright w CI (`pnpm test:visual`), baseline w repo.
7. `packages/ui/README.md`: jak dodać komponent (historia → test → eksport z `index.ts`).

**Ograniczenia.** Bursztyn tylko w `LocationChip` (cień), fokusie, Ginan w `CruxLogo` i kropce nazwy. Żadnych cieni poza `SidePanel`/tooltip. Logo nigdy z fontu. Liczby `tabular-nums` wszędzie (`KpiTile`, `DataTable`, `ArchGauge`). Żadnego pliku `crux-*` w komponentach używanych w dokumentach dla pacjenta. Zależności: `@radix-ui/*` (tylko użyte prymitywy), `lucide-react`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `storybook` i addony, `class-variance-authority`, `clsx`, `tailwind-merge`; wpis do `docs/zaleznosci.md`.

**Sprawdzenie.** `pnpm --filter @crux/ui storybook build`, `pnpm test:visual`, `pnpm lint` (brak HEX w `apps/web`); zrzuty `ArchGauge`, `DotGrid`, `DotPlot`, `PartsBar` obok wzorców z `__reference__/` w `docs/generated/charts-vs-reference.png`.

**Zatrzymaj się, gdy.** Potrzebny komponent spoza inwentarza; chcesz dodać bibliotekę komponentów gotowych.

---

### K09 · `apps/worker`: pg-boss, dispatcher outboxa, harmonogramy, operacje uprzywilejowane  [security]

**Cel.** Proces, który wysyła zdarzenia, wykonuje zadania cykliczne i jako jedyny ma dostęp uprzywilejowany.

**Przeczytaj.** `@docs/01-architektura.md` (sekcja 11), `@docs/02` (ADR-009), `@docs/03a` (sekcja 1), `@docs/05-integracje.md` (sekcja 7).

**Zakres.** `apps/worker/src/**`, `apps/worker/Dockerfile`, `docker-compose.worker.yml`.

**Kroki.**
1. `src/privileged.ts`: lista operacji workera z opisem (`outbox.dispatch`, `backup.nightly`, `analytics.refresh`, `integrity.verify`, `messages.update_status`, `reminders.schedule`), każda z nazwą tabel, których dotyka. `withWorker` (K04) odrzuca operacje spoza listy.
2. pg-boss na `DATABASE_URL_WORKER`, schemat `pgboss`; kolejki: `outbox-dispatch` (co 5 s pobiera `pending` z `next_attempt_at <= now()`, blokada `for update skip locked`, partie po 50), `scheduled-*` (cron przez pg-boss: `analytics.refresh` co 5 min i pełne 02:10 (handler w K13), `backup.nightly` 02:00, `integrity.verify` 03:00, `reminders.schedule` co 10 min (od 1.1)).
3. Dispatcher: rejestr handlerów `topics/<topic>.ts` (w 1.0: `occupancy.entry_recorded.v1`, `occupancy.entry_voided.v1`, `occupancy.day_closed.v1`, `occupancy.day_reopened.v1` → log i zlecenie `analytics.refresh` dla gabinetu i dnia z payloadu; prawdziwe adaptery zewnętrzne od 1.1); handler dostaje `withWorker` i payload zwalidowany schematem zdarzenia; sukces → `status = sent`; błąd → `attempts + 1`, `next_attempt_at = now() + 2^attempts min`, po 8 → `dead` + zdarzenie `platform.outbox.dead.v1` (dla ekranu Integracje).
4. Kopia nocna: `pg_dump` (schematy `public`, `audit`, `platform`, `ref`, `analytics`, bez `pgboss`) → szyfrowanie `age` lub AES-256-GCM kluczem z `KeyProvider` → wysyłka przez `FileStoragePort` (na razie adapter „lokalny folder” + interfejs S3 w 2.0) → wpis w `audit.events` (`backup.completed`) → test odtworzenia na pustym kontenerze (skrypt `tools/restore-test.sh`, uruchamiany ręcznie co kwartał, udokumentowany).
5. Zdrowie: HTTP `/healthz` (`200` gdy pg-boss działa i ostatni dispatch < 60 s temu), logi pino, graceful shutdown na `SIGTERM`.
6. Dockerfile i `docker-compose.worker.yml` do uruchomienia na serwerze w UE; sekrety z env.
7. Testy: dispatcher ponawia z wykładniczym odstępem i oznacza `dead` po 8 próbach (z `FixedClock`); `withWorker('nieznana')` rzuca; zadanie cykliczne nie uruchamia się dwa razy równolegle (pg-boss singleton key).

**Ograniczenia.** Worker nie importuje `apps/web`. Handlery nie wołają API zewnętrznych bezpośrednio: tylko przez porty z `@crux/integrations` (w 1.0 atrapy). Zależności: `pg-boss`, `pino`, `pino-pretty` (dev). Wpis do `docs/zaleznosci.md`.

**Sprawdzenie.** `pnpm --filter worker test`, `docker build`, uruchomienie lokalne z `pnpm db:start` i jednym zdarzeniem w outboxie kończy się `status = sent`.

**Zatrzymaj się, gdy.** pg-boss w zainstalowanej wersji zmienił API cron/singleton (opisz różnice).

---

### K10 · CI, `crux-doctor`, generatory, dependency-cruiser  [chore]

**Cel.** Strażnicy architektury działają automatycznie (ADR-029).

**Przeczytaj.** `@docs/02` (ADR-029), `@docs/09` (sekcje 6–9), `@docs/10` (sekcja 6), `@docs/03` (sekcja 1: zakazane synonimy).

**Zakres.** `tools/doctor/**`, `tools/gen/**`, `.github/workflows/ci.yml`, `packages/config/dependency-cruiser.cjs`.

**Kroki.**
1. `tools/doctor`: program Node (`tsx`) z regułami w `rules/*.ts`, każda: `id`, `level`, `description`, `check(ctx)` → lista naruszeń (plik, linia, komunikat). Reguły 1.0:
   - `db.rls-required`: każda tabela w `public` i `analytics` (z lokalnej bazy przez `information_schema`) ma `relrowsecurity = true` i ≥ 1 politykę; wyjątki w `tools/doctor/allowlist.json` z uzasadnieniem.
   - `db.pgtap-required`: każda tabela ma plik `supabase/tests/<tabela>.sql`.
   - `db.table-comment`: komentarz tabeli zawiera `rls:` i `append_only:`.
   - `db.append-only-grants`: tabele oznaczone `append_only: yes` nie mają polityk `update`/`delete` dla `authenticated`.
   - `code.no-any`, `code.no-as-unknown`, `code.no-new-date` (poza `shared/time`), `code.no-service-role`, `code.no-security-definer` (poza allowlist).
   - `code.usecase-authorize`: każdy plik w `application/` eksportujący funkcję z `Actor` w sygnaturze zawiera wywołanie `authorize(`.
   - `code.thin-server-action`: pliki z `'use server'`: żadna funkcja > 25 linii.
   - `code.module-imports`: brak importów `packages/modules/*/src/`.
   - `code.vocabulary`: brak identyfikatorów `visit`, `clinic`, `branch`, `customer`, `client`, `doctor` (jako rola), `bill`, `slot` (jako encja; słownik: wpis obłożenia) w `packages/modules` i `apps` (lista w `tools/doctor/vocabulary.json`, z wyjątkami dla tekstów i18n).
   - `ui.no-hex`: brak `#[0-9a-f]{3,8}` i `-[#` w `apps/web/**/*.tsx` i `packages/ui/src/**` poza `brand/` i `tokens.extra.css`.
   - `ui.brand-sync`: sumy kontrolne plików w `packages/ui/brand/` zgodne z `brand/manifest.json`.
   - `ui.brand-separation`: żadnego pliku `crux-*` ani `CruxLogo` w `packages/ui/src/documents/`, `packages/modules/messaging/` i `apps/web/app/(public)/`.
   - `ui.metric-form`: każde użycie `runMetric('<id>')` w `apps/web` renderuje formę zgodną z polem `forma` w rejestrze (sprawdzenie po nazwie komponentu w tym samym pliku).
   - `analytics.metric-registered`: każde `runMetric('…')` w `apps/web` ma wpis w `metricRegistry` i wiersz w `docs/11`, sekcja 4.
   - `analytics.no-pii`: zabronione nazwy kolumn w schemacie `analytics` (`first_name`, `last_name`, `pesel*`, `phone`, `email`, `address`).
   - `deps.documented`: każda zależność z `package.json` ma wiersz w `docs/zaleznosci.md`.
   - `spec.traceability`: dla specyfikacji ze statusem `w realizacji`/`wdrożona` każde `ACn` ma test z `[ID/ACn]` (grep po `*.test.ts`, `*.spec.ts`, `supabase/tests`).
   - `docs.rules-checksum`: `AGENTS.md` i `.cursor/rules/*` mają sumy w `docs/.rules-lock.json`; zmiana bez aktualizacji locka = ostrzeżenie (lock aktualizuje `pnpm doctor --update-lock`, co wymusza świadomą zmianę).
   Wyjście: tabela w konsoli + adnotacje GitHub (`::error file=…`).
2. `tools/gen` (plop lub własny skrypt): `pnpm gen module <name>` (szkielet z `01`, sekcja 5, `README.md`, `permissions.ts`, `events.ts`, test RLS szablon, wpis w dependency-cruiser, reguła `.cursor/rules/module.mdc` w pakiecie), `pnpm gen usecase <module> <name>`, `pnpm gen screen <route>`, `pnpm gen metric <id>` (plik metryki ze szkieletem, test na zestawie wzorcowym, wiersz do wklejenia w `docs/11`); szablony w `tools/gen/templates/` odzwierciedlają wzorce z `09`, sekcja 3.
3. `dependency-cruiser.cjs`: graf z `01`, sekcja 4, pełny (wszystkie moduły, także przyszłe); `pnpm lint:deps` i `pnpm lint:deps:graph` (SVG do `docs/generated/`).
4. CI: zadania `typecheck`, `lint`, `lint:deps`, `test`, `test:db` (z `supabase start` w CI), `doctor`, `test:visual`, `e2e`; cache pnpm i Playwright; `gitleaks`; `pnpm audit --audit-level high` jako ostrzeżenie; status wymagany do merge.
5. Szablon PR `.github/pull_request_template.md` z definicją ukończenia z `AGENTS.md`, listą kontrolną UI z `docs/14`, sekcja 11, i polem „Prompt/ledger”.

**Ograniczenia.** Doctor nie może mieć fałszywych alarmów na obecnym repo: po K10 `pnpm doctor` jest zielony. Wyjątki tylko przez `allowlist.json` z uzasadnieniem.

**Sprawdzenie.** `pnpm doctor` zielone; celowe naruszenie (np. `any` w pliku testowym) zostaje wykryte; `pnpm gen module demo` tworzy pakiet, który przechodzi `typecheck` i `doctor`; usuń `demo` po teście.

**Zatrzymaj się, gdy.** Reguła wymaga dostępu do bazy w CI, a Supabase w CI nie działa (wtedy reguła `db.*` działa lokalnie i w CI z etykietą `requires-db`).

---

### K11 · Moduł wzorcowy: obłożenie godzinowe foteli (F0-010) w 4 częściach  [security, money-adjacent]

**Cel.** Pierwsza funkcja od specyfikacji do e2e, która staje się wzorcem do kopiowania, i zarazem rdzeń wydania 1.0: recepcja wpisuje, jak pracowały fotele, bez żadnych danych pacjenta.

**Przeczytaj.** `@docs/specs/F0-010-oblozenie-godzinowe.md`, `@docs/03a-schemat-bazy.md` (sekcja 5: `chair_occupancy`, `occupancy_day_closures`, `time_blocks`), `@docs/03-model-domeny.md` (ChairOccupancy), `@docs/06` (sekcja 5: wzorce ekranów; `HourGrid` z K08), `@docs/09` (sekcja 3), `@docs/10` (sekcja 2).

**Część 1/4 · migracja i RLS.** Uruchom `pnpm gen module scheduling` (pakiet istnieje jako szkielet z K01; generator uzupełnia). Migracja: enum `occupancy_source`, tabele `chair_occupancy`, `occupancy_day_closures`, `time_blocks` dokładnie jak w `03a`, sekcja 5 (więz wykluczający nakładanie na fotelu dla wpisów nieunieważnionych, `check` na długość notatki, indeksy). Trigger audytu na wszystkich trzech. RLS `tenant_location` dla wszystkich; insert/update `chair_occupancy` tylko z `occupancy.write` (w gabinecie) lub `occupancy.write_own` (gdy `provider_id = auth.staff_id()`); `delete` nikomu. pgTAP: AC2 (nakładanie → `23P01`), AC4 (recepcja 01 nie widzi 02, tenant B nic), unieważniony wpis nie blokuje więzu, `dentist` nie zapisze wpisu z cudzym `provider_id`. Sprawdzenie: `pnpm db:test`.

**Część 2/4 · domena.** `domain/chair-occupancy.ts`: `OccupancyEntry.create(input, clock, context)` z regułami: pełne godziny lokalne w 1.0 (`hourRange`), w godzinach otwarcia gabinetu z wyjątkami (`getOpeningHours`), poza blokadą fotela, kategoria z `Z1`…`Z+`, kwota ≥ 0 w groszach, notatka ≤ 80 znaków i `containsPii === false` (AC7), `overrideReason` wymagany poza godzinami (AC3); `void(entry, reason)`; `DayClosure.close(location, day, entries, capacity)` zwracający podsumowanie (godziny, kwota, fotele bez wpisów); `isDayClosed`; reguła „po zamknięciu dnia zmiana wymaga `occupancy.write_closed` i powodu” (AC5). Testy jednostkowe z `FixedClock`, w tym dzień zmiany czasu.

**Część 3/4 · przypadki użycia.** `recordOccupancy` (tworzy lub aktualizuje wpis dla fotela i godziny; `commandId`), `recordOccupancyRange` (jedna komenda dla wielu godzin tego samego fotela, np. 9:00–13:00; transakcja), `voidOccupancy` (powód; zdarzenie `occupancy.entry_voided.v1`), `copyDayFrom(location, sourceDay, targetDay)` („dzień jak wczoraj”: kopiuje wykonawców i kategorie, bez kwot), `closeDay` (zdarzenie `occupancy.day_closed.v1`), `reopenDay` (`occupancy.write_closed`, powód), `createTimeBlock`/`endTimeBlock` (fotel: serwis, zamknięcie, szkolenie, inne), zapytania: `getDayGrid(locationIds, day)` (jedna kwerenda: fotele, godziny otwarcia, wpisy, blokady, status zamknięcia; AC10), `getWeekSummary(locationIds, isoWeek)`, `listOccupancy(filters)` dla listy drążenia. Każdy: Zod, `commandId`, `authorize`, `withActor`, outbox. Testy integracyjne: AC1, AC3, AC5, AC6, AC8; `assistant` tylko czyta; `dentist` zapisuje tylko swoje.

**Część 4/4 · UI i e2e.** `pnpm gen screen oblozenie`. Ekran `/oblozenie?gabinet=01&dzien=2026-11-12`: nagłówek z `LocationSwitcher`, datą i nawigacją `←/→`, `T` dziś; `HourGrid` (kolumny = fotele z chipem gabinetu, wiersze = godziny otwarcia); komórka: pusta (wolna), wpis (tło kolornika kategorii, pasek 4 px, inicjały wykonawcy, kwota w formacie `450 zł` jeśli jest), blokada (kreskowanie, słowo); klawiatura: strzałki po komórkach, `Enter` otwiera `SidePanel` wpisu (wykonawca `Select` z personelu gabinetu, kategoria `ChipToggle` Z1–Z+, kwota `Input` w złotych z przecinkiem, notatka, zakres godzin), `1`–`6` ustawia kategorię od razu, `Backspace` unieważnia z `ConfirmDialog` i powodem, `Shift+strzałka` zaznacza zakres godzin; pasek dnia: suma godzin, suma kwot, „Zamknij dzień” (`ConfirmDialog` z podsumowaniem i listą foteli bez wpisów), stan „Dzień zamknięty” z chipem i przyciskiem „Otwórz ponownie” dla uprawnionych; „Dzień jak wczoraj”; widok tygodnia (`/oblozenie/tydzien`): `DotCalendar` obłożenia per fotel i dzień plus tabela sum. Stany: ładowanie, pusty gabinet („Dodaj fotele w Ustawieniach”), błąd. Teksty i18n. e2e (AC9): wypełnienie 3 godzin z klawiatury, kolizja z komunikatem, zamknięcie dnia, próba edycji po zamknięciu jako recepcja odrzucona, kierownik edytuje z powodem; iPad 1024×768.

**Po części 4.** Napisz `packages/modules/scheduling/README.md` i `docs/wzorzec-modulu.md`: „jak skopiować moduł obłożenia do nowego modułu” z listą plików, kolejnością i miejscami, gdzie wzorzec celowo jest prosty (brak pacjenta, brak statusów).

**Sprawdzenie.** `pnpm typecheck && pnpm lint && pnpm test && pnpm db:test && pnpm e2e && pnpm doctor` zielone; `spec.traceability` dla F0-010 pełne; status specyfikacji → `w realizacji` → po wdrożeniu na staging `wdrożona`.

**Zatrzymaj się, gdy.** Spec wymaga pola, którego nie ma w `03a` (najpierw PR do `03a`); chcesz dodać do wpisu cokolwiek identyfikującego pacjenta.

---

### K12 · `packages/testing`: fabryki, zestaw wzorcowy, demo  [chore]

**Cel.** Dane syntetyczne do testów, stagingu i prezentacji; nigdy prawdziwe osoby.

**Przeczytaj.** `@docs/09` (sekcja 5), `@docs/04` (sekcja 6 „Dane”), `@AGENTS.md` (sekcja „Nigdy”, dane testowe), `@docs/11` (sekcja 4.7: metryki 1.0).

**Zakres.** `packages/testing/src/**`, `supabase/seed.sql` (tylko słowniki), skrypt `pnpm seed:demo`.

**Kroki.**
1. Fabryki (`fishery` lub własne): `tenantFactory`, `locationFactory` (01 Nowodworska `color_key=01`, 02 Białowieska `color_key=02` jako stałe; numeracja z `docs/14`, sekcja 4), `chairFactory`, `openingHoursFactory` (pn–pt 8–20, sb 8–14), `staffFactory` (imiona i nazwiska z generatora sylab, bez list prawdziwych osób; NPWZ syntetyczne z poprawną sumą kontrolną oznaczone prefiksem testowym), `occupancyEntryFactory`, `timeBlockFactory`, `dayClosureFactory`. Fabryki dla pacjentów i wizyt dochodzą w 1.1 (`F1`, K01–K02).
2. Zestaw wzorcowy `golden/`: generator z ziarnem (`seed = 20261105`) tworzący 2 gabinety (01: 3 fotele, 02: 2 fotele), 5 wykonawców, 13 miesięcy wpisów obłożenia (rozkład: 01 ok. 80%, 02 ok. 65%, sobota niżej, kategorie wg wag, kwoty z zakresów per kategoria), 6 blokad, dni zamknięte w 95%; zapisuje oczekiwane wartości metryk 1.0 do `golden/expected.json` policzone **niezależnie** naiwnym SQL w `golden/verify.sql` i opisane w `golden/README.md` (jak policzono każdą wartość).
3. `pnpm seed:demo`: zasiewa lokalną bazę/staging tenantem demo (`Zenit Stomatologia DEMO`) z fabryk; blokada uruchomienia, gdy `DATABASE_URL` wskazuje produkcję (sprawdzenie nazwy hosta z listy w `.env`).
4. Atrapy portów: `fakeSms`, `fakeFileStorage` (folder tymczasowy), `fakeKeyProvider`, `fakeAuthAdmin` w `packages/testing/src/fakes/` używane przez testy i tryb `FAKE_INTEGRATIONS=1`.

**Ograniczenia.** Żadnych nazwisk ani numerów przypominających prawdziwe osoby; tylko generator sylab. Zależności: `fishery` (opcjonalnie), `seedrandom`.

**Sprawdzenie.** `pnpm seed:demo` na lokalnej bazie; `pnpm test` korzysta z fabryk w ≥ 1 teście integracyjnym każdego modułu; `golden/verify.sql` uruchomiony na zasianym zestawie daje wartości z `expected.json`.

---

### K13 · `@crux/analytics` 1.0: schemat, zasilanie, rejestr metryk  [security]

**Cel.** Pulpity liczą z osobnego schematu od pierwszego dnia; każda metryka to kod z testem i wpisem w rejestrze.

**Przeczytaj.** `@docs/specs/F0-011-pulpit-1-0.md`, `@docs/02` (ADR-027), `@docs/03a` (sekcja 12), `@docs/11` (sekcje 1, 3, 4.6, 4.7, 8), `@docs/01` (sekcja 12), `@.cursor/rules/70-analytics.mdc`.

**Część 1/2 · wymiary, fakty, zasilanie.** `pnpm gen module analytics` (szkielet z K01). Migracja w schemacie `analytics`: `dim_date` (wypełniona 2020–2040, święta PL z funkcji, `is_working_day`), `dim_location`, `dim_chair`, `dim_provider` (klucz, nazwa wyświetlana, tytuł; dane pracownicze), `dim_category` (Z1–Z+), `fact_chair_capacity` (fotel × dzień: minuty otwarcia minus wyjątki minus blokady), `fact_chair_occupancy` (fotel × dzień × wykonawca × kategoria: minuty, kwota w groszach, liczba wpisów; źródło wg `scheduling.occupancy_mode` gabinetu: w 1.0 `chair_occupancy`, od 1.1 także `appointments`), `fact_day_closures`, `refresh_log`. Indeksy `(tenant_id, location_id, date_key)`. RLS `tenant_location` + widoki per rola: `v_self_*` (`provider_key = auth.staff_id()`), `v_location_*`, `v_network_*`; uprawnienia `analytics.view_self/location/network`. Reguła `doctor` `analytics.no-pii` (z K10) przechodzi. Worker `analytics.refresh` (K09): przyrostowo co 5 min (gabinet i dzień z payloadu zdarzeń oraz ostatnie 48 h; upsert po kluczu naturalnym), pełne 02:10 dla 13 miesięcy; `refresh_log` z oknem, czasem i liczbą wierszy; idempotentne (dwukrotne uruchomienie = ten sam wynik; test). pgTAP: lekarz nie widzi wierszy innego lekarza w `v_self_*`; kierownik nie widzi innego gabinetu.

**Część 2/2 · rejestr metryk.** `packages/modules/analytics/src/metrics/registry.ts` i `metrics/<id>.ts` dla metryk 1.0 z `docs/11`, sekcja 4.7: `chair_utilization`, `chair_hours_worked`, `revenue_realized` (1.0: suma kwot z wpisów obłożenia; definicja w rejestrze ma pole `since` i zmieni źródło w 2.0 bez zmiany `id`), `revenue_per_chair_hour`, `revenue_by_category`, `provider_hours_worked`, `days_closed_rate`. Każda: `{ id, name, definition, since, direction, goodDirection, forma, grain[], permission, sql (parametryzowany: tenant, locations, providers, categories, from, to), drilldown: { entity: 'oblozenie', filters } }`; `runMetric(id, filters, actor)` z cache 60 s per (tenant, rola, filtry) i walidacją filtrów wg roli po stronie serwera (lekarz nie ustawi `wykonawca=inny`; kierownik zablokowany na swój gabinet); `metricRegistry` eksportowany. Test per metryka na zestawie wzorcowym (`expected.json`) i test drążenia (`[F0-011/AC4]`: suma rekordów z `drilldown` = wartość metryki dla `revenue_realized` i `chair_hours_worked`).

**Ograniczenia.** Dashboardy nie liczą nic z tabel operacyjnych (wyjątek: siatka dnia w `/oblozenie`, która jest ekranem operacyjnym). Żadnej kolumny identyfikującej pacjenta w `analytics` (w 1.0 nie ma pacjentów; reguła chroni przyszłość).

**Sprawdzenie.** `pnpm test --filter @crux/analytics && pnpm db:test && pnpm doctor`; `refresh_log` po `pnpm seed:demo` i jednym cyklu workera pokazuje 13 miesięcy.

**Zatrzymaj się, gdy.** Metryka wymaga danych, których nie ma w `03a` (najpierw PR do `03a` i `11`).

---

### K14 · Pulpity 1.0: sieć, gabinet, moje; lista drążenia (F0-011)  [ui]

**Cel.** Zarząd, kierownik i lekarz widzą obłożenie i przychód na jednych definicjach, w formach z modelu kuleczkowego, z drążeniem do wpisów.

**Przeczytaj.** `@docs/specs/F0-011-pulpit-1-0.md`, `@docs/11` (sekcje 3, 4.6, 4.7, 5.7, 6, 9), `@docs/06` (sekcje 4.1, 4.2, 6), `@docs/14-guideline-aplikacji.md` (sekcja 6: procedura przy każdym wykresie), `@design/crux-dashboard-prototyp.html`, wzorce `packages/ui/src/charts/__reference__/*.svg`.

**Część 1/2 · pulpity.** `FilterBar` z kontraktem URL z `docs/11`, sekcja 3 (`okres`, `porownaj`, `gabinet`, `wykonawca`, `kategoria`; `widok` per karta), zapamiętywanie w `localStorage`. `/pulpit` (sieć, `analytics.view_network`): układ z `docs/11`, 5.7: rząd kafli (`chair_utilization`, `chair_hours_worked`, `revenue_realized`, `revenue_per_chair_hour`; na ≥ 1440 px także `days_closed_rate` i `provider_hours_worked`), wykres główny: przychód tygodniowo per gabinet (`LineChart`, kolory z `color_key`, etykiety końców linii, linia celu z `analytics.targets.*`, gdy ustawiona), siatka 2 × N: łuki obłożenia per gabinet (`ArchGauge`), porównanie gabinetów (`DotPlot`: obłożenie, przychód/h, godziny, dni zamknięte), struktura przychodu wg kategorii (`PartsBar`), rytm tygodnia (`DotCalendar`), fotele (`BarList` godzin per fotel), jakość danych (lista dni niezamkniętych z linkiem do `/oblozenie`). `/pulpit/gabinet` (kierownik, zablokowany na swój gabinet; te same karty dla jednego gabinetu plus tabela wykonawców: godziny, kwota, kwota/h). `/pulpit/moje` (lekarz, higienistka: `v_self_*`; kafle moje godziny, moja kwota, moja kwota/h; druga liczba „mediana gabinetu” bez nazwisk; `DotCalendar` moich dni). Dane przez `runMetric` w Server Components z `Suspense` per karta; cache 60 s; stopka z `refreshed_at` z `refresh_log`.

**Część 2/2 · drążenie i eksport.** `/lista/oblozenie` z `metric` i filtrami: zakładki „w liczniku” / „w mianowniku” (dla `chair_utilization`: wpisy i pojemność foteli per dzień), `DataTable`, suma kontrolna równa kaflowi (`[F0-011/AC4]`), CSV (`analytics.export`, wpis w `audit.events`). e2e: zmiana filtra przeładowuje karty bez migotania; link z filtrami odtwarza widok; lekarz na `/pulpit` dostaje przekierowanie do `/pulpit/moje`; kierownik z `gabinet=02` spoza członkostwa dostaje swój gabinet; klawiatura na wykresie (fokus na punktach, strzałki, tooltip); widok tabeli każdej karty.

**Ograniczenia.** Bursztyn nie występuje na pulpicie (poza fokusem). Kolory gabinetów z `locations.color_key`. Żadnych wykresów kołowych ani pierścieniowych. Forma każdej karty z pola `forma` w rejestrze (`ui.metric-form`). Przy każdej karcie zrzut ekranu w PR (procedura `14`, 6.1, pkt 9), w obu motywach.

**Sprawdzenie.** pełny zestaw + `spec.traceability` dla F0-011; p95 renderu `/pulpit` na zestawie wzorcowym < 1,5 s (pomiar w e2e z `performance.now()`).

**Zatrzymaj się, gdy.** Potrzebna metryka spoza rejestru (najpierw `pnpm gen metric` + `docs/11`).

---

### K15 · Ekrany administracji: organizacja, personel, ustawienia, integracje  [security]

**Cel.** Miłosz i Bartek zarządzają siecią z aplikacji, bez SQL: gabinety, fotele, godziny, personel, role, flagi.

**Przeczytaj.** `@docs/03a` (sekcje 2–3), `@docs/06` (sekcja 5: formularze, tabele), `@docs/04` (sekcja 6 „Dostęp”), `@docs/01` (sekcja 15: nowy gabinet bez kodu).

**Zakres.** `apps/web/app/(app)/ustawienia/**`, `apps/web/app/(app)/integracje/**`, `apps/web/features/{org,identity,platform}/**`.

**Kroki.**
1. `/ustawienia/organizacja` (`org.manage`): lista gabinetów z chipami i kolorami danych; formularz gabinetu (numer, nazwa, adres, kod resortowy, kolor z puli, `active`, `opened_on`); fotele gabinetu (nazwa, kolejność przeciąganiem, wyposażenie jako `ChipToggle`, `active`); godziny otwarcia tygodniowe z zakresami obowiązywania; wyjątki (kalendarz: święto, dzień skrócony, powód). Każda zmiana przez przypadki użycia z K06; audyt widoczny w zakładce „Historia zmian” (`audit.read`).
2. `/ustawienia/personel` (`staff.manage`): lista personelu z rolami per gabinet i statusem konta (brak konta, zaproszony, aktywny, MFA zarejestrowane, dezaktywowany); formularz osoby (dane, tytuł, NPWZ, kolor w grafiku, kompetencje Z1–Z+); członkostwa (gabinet, rola, od, do); „Zaproś” (tworzy konto, pokazuje hasło jednorazowe raz, do przekazania osobiście), „Resetuj MFA” (z powodem), „Dezaktywuj” (kończy członkostwa, wylogowuje); własny profil `/ustawienia/profil` (zmiana hasła, MFA, motyw jasny/ciemny).
3. `/ustawienia/system` (`settings.manage`): flagi funkcji per tenant/gabinet z opisem i datą zmiany; ustawienia z rejestru kluczy (`scheduling.occupancy_mode` per gabinet z ostrzeżeniem, `analytics.targets.*` per gabinet i miesiąc); `/ustawienia/o-crux` (z K07).
4. `/integracje` (`integrations.manage`): szkielet ekranu z `docs/11`/F1-010: lista portów z atrapami w 1.0 („SMS: niepodłączone”, „Platforma P1: od wydania 3.0”), kolejka outboxa (`pending`, `dead` z przyciskiem „ponów”), ostatnie 100 wpisów `integration_log` bez danych osobowych, stan workera (`/healthz` i ostatni `refresh_log`).
5. e2e: dodanie fotela i godzin w 02 przez `network_admin`; kierownik 01 nie widzi edycji organizacji; zaproszenie osoby i pierwsze logowanie z wymuszoną zmianą hasła; włączenie flagi zmienia nawigację po odświeżeniu.

**Ograniczenia.** Hasło jednorazowe pokazywane raz, nigdy w logach ani e-mailu. Dezaktywacja nie usuwa danych (członkostwa dostają `ends_on`). Każdy formularz: etykieta nad polem, błąd przy polu, zapis `Ctrl+Enter`, nieudany zapis nie czyści pól.

**Sprawdzenie.** `pnpm e2e` zielone; `pnpm doctor` zielone; lista kontrolna UI z `docs/14`, sekcja 11, w PR.

**Zatrzymaj się, gdy.** Supabase Auth nie pozwala tworzyć kont z serwera bez `service_role` (wtedy `AuthAdminPort` realizowany w workerze jako operacja uprzywilejowana `auth.invite` z własnym audytem; opisz).

---

### K16 · Obserwowalność bez danych osobowych, procedury operacyjne  [security]

**Cel.** Logi, błędy i ślady bez danych osobowych; dokumenty operacyjne wymagane przez rozporządzenie (§ 1 ust. 5) gotowe, zanim w 1.1 pojawią się dane pacjentów.

**Przeczytaj.** `@docs/02` (ADR-016), `@docs/04` (sekcje 2 wiersz „§ 1 ust. 5”, 6), `@AGENTS.md`.

**Zakres.** `packages/shared/src/logger.ts`, `apps/web/instrumentation.ts`, `apps/worker/src/telemetry.ts`, `docs/ops/**`.

**Kroki.**
1. Logger pino z **listą dozwolonych pól** (`requestId`, `actorId`, `tenantId`, `locationId`, `module`, `usecase`, `durationMs`, `errorType`, identyfikatory `*Id`); każde inne pole jest usuwane przez serializer; dodatkowo `containsPii` (K03) na wartościach tekstowych; test: próba zalogowania obiektu z `pesel`, `lastName`, `phone`, `content` kończy się usunięciem tych pól i ostrzeżeniem `logger.redacted`.
2. Sentry (region UE, DSN z env) z `sendDefaultPii: false`, `beforeSend` usuwającym `request.data`, `user` poza `id`, nagłówki, ciasteczka; brak replay; test jednostkowy `beforeSend`.
3. OpenTelemetry: trace dla server actions i handlerów workera (`@opentelemetry/sdk-node`, eksporter OTLP do adresu z env; domyślnie wyłączony lokalnie), atrybuty tylko identyfikatory; `requestId` z `proxy.ts` propagowany do bazy jako `set_config('crux.request_id')` w `withActor`, zapisywany w `audit.events.request_id`.
4. `docs/ops/`: `incydent-bezpieczenstwa.md` (72 h, role, szablon zgłoszenia do UODO), `korekta-wpisu.md` (procedura udokumentowana, § 1 ust. 6 pkt 1; w 1.0 dotyczy wpisów obłożenia i konfiguracji), `kopie-i-odtwarzanie.md` (PITR, `pg_dump`, test kwartalny, RPO/RTO), `nowy-pracownik.md` i `odejscie-pracownika.md` (konta, członkostwa, MFA, tokeny; z ekranami z K15), `wdrozenie-produkcyjne.md` (okno po 20:00, lista kontrolna), `supabase-konfiguracja.md` (z K02), `zaleznosci-przeglad.md` (co kwartał). Każdy dokument: właściciel, data przeglądu.

**Ograniczenia.** Zależności: `pino`, `@sentry/nextjs`, `@sentry/node`, `@opentelemetry/*` (minimalny zestaw). Wpis do `docs/zaleznosci.md` z uwagą o DPA Sentry.

**Sprawdzenie.** `pnpm test --filter @crux/shared` (logger), ręczne wywołanie błędu na stagingu pokazuje w Sentry zdarzenie bez danych osobowych (zrzut do `docs/ops/`).

**Zatrzymaj się, gdy.** Jakikolwiek pakiet telemetryczny wymaga wysyłki do regionu poza UE bez możliwości zmiany.

---

### K17 · Wydanie 1.0 „Krasnodrzew”: produkcja, konta, instrukcja, bramka  [security, chore]

**Cel.** Crux 1.0 działa w obu gabinetach: recepcja wpisuje obłożenie, zarząd patrzy na pulpit, wszystko udokumentowane.

**Przeczytaj.** `@docs/07` (sekcja 2: bramka 1.0), `@docs/ops/wdrozenie-produkcyjne.md`, `@docs/ops/supabase-konfiguracja.md`, `@docs/04` (sekcja 5: warunki Supabase), `@podrecznik/PODRECZNIK-CRUX-1.0.md` (rozdział 12).

**Zakres.** Konfiguracja produkcji (poza repo: Supabase `crux-prod`, Vercel, serwer workera), `docs/ops/`, `docs/instrukcje/`, `CHANGELOG.md`, tag.

**Kroki.**
1. Produkcja: projekt Supabase `crux-prod` (organizacja „Zenit Stomatologia”, `eu-central-1`, Pro + PITR) wg listy kontrolnej; Data API i Realtime wyłączone; role `crux_app`/`crux_worker` z osobnymi hasłami; migracje przez CI (`db:push` z taga); Vercel projekt `crux` (region `fra1`, zmienne środowiskowe, domena `crux.zenitstomatologia.pl`; staging `crux-staging.zenitstomatologia.pl` z ochroną hasłem; Supabase Auth `Site URL` i `Redirect URLs` tylko z tych adresów; ciasteczka host-only; ADR-033), worker na serwerze w UE (`docker-compose.worker.yml`, sekrety z menedżera sekretów, `/healthz` monitorowany); Sentry UE; kopie nocne włączone i jedna odtworzona testowo na pustym kontenerze (wynik w `docs/ops/kopie-i-odtwarzanie.md`).
2. Dane startowe produkcji (skrypt jednorazowy `tools/bootstrap-prod.ts`, uruchamiany ręcznie z audytem): tenant (podmiot leczniczy, dane z KRS/RPWDL), gabinety 01 Nowodworska i 02 Białowieska (adres, kod resortowy, kolory), fotele i godziny otwarcia wg spisu z dnia obserwacji, konta: `network_admin` (Miłosz, Bartek), `location_manager` i `receptionist` per gabinet, `dentist`/`hygienist` dla wykonawców z grafiku; hasła jednorazowe przekazane osobiście; MFA zarejestrowane przy pierwszym logowaniu.
3. `docs/instrukcje/recepcja-oblozenie.md` (1 strona, ze zrzutami): jak wpisać dzień w 2 minuty, klawisze, „dzień jak wczoraj”, zamknięcie dnia, co robić przy pomyłce; `docs/instrukcje/zarzad-pulpit.md` (1 strona): filtry, co znaczy każda liczba (link do definicji), drążenie, eksport. Szkolenie 15 minut per gabinet; lista obecności w `docs/ops/`.
4. `CHANGELOG.md` z wpisem `1.0.0 · Krasnodrzew · <data>` (zakres, znane ograniczenia: brak pacjentów i wizyt, dane finansowe z wpisów ręcznych), tag `v1.0.0`, wpis `1.0 · wydanie` w `ledger.md`.
5. Pierwsze 2 tygodnie: codzienny przegląd `days_closed_rate` i `dead` w outboxie; po 2 tygodniach retrospektywa z recepcją (co trwa za długo), wnioski do backlogu 1.1.

**Ograniczenia.** Żadnych danych pacjentów na produkcji przed wydaniem 1.1 (reguła w `AGENTS.md`; `doctor` sprawdza, że migracje tabel `patients*` nie istnieją w 1.0). Hasła nigdy w kanałach pisemnych.

**Sprawdzenie.** Bramka 1.0 z `docs/07`, sekcja 2: oba gabinety wpisują obłożenie przez 10 kolejnych dni roboczych z `days_closed_rate ≥ 90%`; pulpit sieci pokazuje wartości zgodne z sumą wpisów (drążenie); `pnpm doctor` zielony na tagu; test odtworzenia kopii wykonany; zero zdarzeń `dead`.

**Zatrzymaj się, gdy.** Supabase lub Vercel wymagają zgody na transfer danych poza UE w konfiguracji, której nie da się wyłączyć (opisz, co dokładnie; `docs/04`, sekcja 5).

---

### Po 1.0: przegląd adwersarialny całości i bramka

Nowy czat z promptem 3.5 z `docs/10` na całe repo (diff od pustego). Lista kontrolna bramki 1.0 z `docs/07`, sekcja 2. Zapisz wynik w `ledger.md` jako wpis `1.0 · bramka`. Dopiero potem `prompts/F1-pacjenci-terminarz.md` (wydanie 1.1 „Ratania”), które wymaga ukończonego toru B (opinia prawna, DPIA, umowy powierzenia).
