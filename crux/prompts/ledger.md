# Rejestr promptów (ledger)

Każda zastosowana sesja promptów ma tu wpis. Nowy czat (Claude lub Cursor) czyta 10 ostatnich wpisów przed planem. Format: `docs/10-praca-z-ai.md`, sekcja 7. Najnowsze wpisy na górze.

## Szablon

```
## RRRR-MM-DD · <ID specyfikacji lub wydanie> · <prompt> · część <n>
Prompt: prompts/<plik>.md#<P>
Commit: <hash> · Gałąź: <nazwa>
Wynik: <CI zielone / co nie przeszło i dlaczego>
Uwagi: <co model chciał zrobić inaczej, co odrzucono, decyzje, dług>
```

## Wpisy

## 2026-11-25 · 1.0 · wydanie Krasnodrzew (kod)
Prompt: prompts/F0-fundament.md#K17
Commit: 0942269 · Tag: v1.0.0 · Gałąź: main
Wynik: artefakty wydania w repo; `doctor` OK; `release.no-patient-tables` OK. Bramka operacyjna (`docs/ops/bramka-1-0.md`) **otwarta** — 10 dni wpisów, szkolenie, restore prod, zero dead po go-live (plan 11.12.2026).
Uwagi: infrastruktura Supabase/Vercel/worker poza repo; `bootstrap:prod` z konfiguracją poza repo; wpis `1.0 · bramka` dopiero po spełnieniu docs/07 §2.

## 2026-11-25 · K17 · wydanie 1.0: bootstrap, instrukcje, changelog, tag · część 1
Prompt: prompts/F0-fundament.md#K17
Commit: 0942269 · Gałąź: main
Wynik: `doctor` OK; `bootstrap:prod --help/--dry-run` OK; version 1.0.0.
Uwagi: `tools/bootstrap-prod.ts` (blokada non-prod); instrukcje recepcja/zarząd; ops bramka + lista obecności; CHANGELOG 1.0.0; F0-010/011 nadal „w realizacji” do bramki.

## 2026-11-25 · K16 · obserwowalność bez PII + docs/ops · część 1
Prompt: prompts/F0-fundament.md#K16
Commit: c0bd0f4 · Gałąź: main
Wynik: `@crux/shared` 53/53 (logger + beforeSend); `@crux/db` 7/7 (request_id); web/worker typecheck OK; `doctor` OK.
Uwagi: shared `createLogger` allowlist + containsPii; Sentry UE (server/edge/worker, bez client replay); OTel opcjonalnie przez OTLP; `withActor` + proxy `x-request-id` → `crux.request_id`; `docs/ops/` (8 procedur + README). Brak zrzutu Sentry staging (brak DSN).

## 2026-11-25 · K15 · ekrany administracji: org, personel, system, integracje · część 1
Prompt: prompts/F0-fundament.md#K15
Commit: 301c9b7 · Gałąź: main
Wynik: web typecheck/lint OK; org 3, identity 3, platform 9 (fileParallelism off); `db:test` 70; `doctor` OK. e2e ustawienia na E2E_*.
Uwagi: `/ustawienia/{organizacja,personel,system,profil}`, `/integracje`; AuthAdmin invite + reset MFA (SUPABASE_SECRET_KEY); hasło jednorazowe tylko w UI; `0015_outbox_retry`; vitest `fileParallelism: false` w modułach DB. Luki: historia audytu org bez triggerów; force-password e2e niekompletne.

## 2026-11-25 · K14 · pulpity 1.0 + lista drążenia (F0-011) · część 1–2
Prompt: prompts/F0-fundament.md#K14
Commit: 0b4f243 · Gałąź: main
Wynik: web typecheck/lint OK; web test 14/14; analytics 28/28; `doctor` OK. e2e pulpit na E2E_* (skipped bez env).
Uwagi: `/pulpit`, `/pulpit/gabinet`, `/pulpit/moje`, `/lista/oblozenie` (+ CSV export); FilterBar URL `docs/11` §3; redirecty ról AC3; query helpers tylko z `analytics.*`. Luki: mediana na „moje” (placeholder); audyt eksportu przez outbox nie `audit.events`; linia celu przychodu / pełne porownaj=cel poza utilization; zrzuty PR w obu motywach do doklejenia ręcznie.

## 2026-11-25 · K13 · @crux/analytics: schemat, refresh, rejestr metryk · część 1–2
Prompt: prompts/F0-fundament.md#K13
Commit: cae7b73 · Gałąź: main
Wynik: `@crux/analytics` 22/22 (metryki = golden expected, AC4 drilldown, idempotent refresh); `db:test` 70 OK (040_analytics); `doctor` OK; `seed:demo` + `analytics:refresh` → refresh_log 9322 wierszy (2025-10-01…2026-10-31).
Uwagi: migracje `0013`/`0014`; widoki v_self/location/network; RLS faktów z poziomem uprawnień (lekarz tylko własne); worker `analytics.refresh` pełny; sentinel provider_key dla NULL; F0-011 status „w realizacji”.

## 2026-11-25 · K12 · @crux/testing: fabryki, golden, seed:demo, atrapy · część 1
Prompt: prompts/F0-fundament.md#K12
Commit: b5c113a · Gałąź: main
Wynik: `@crux/testing` 11/11; `pnpm seed:demo` + `verify:golden` OK (verify.sql = expected.json); scheduling 31, org/identity/platform smoke z fabrykami OK; `db:test` 53; `doctor` OK.
Uwagi: golden seed=20261105, okres 2025-10-01…2026-10-31, 13377 wpisów; color_key `01`–`04` (+loc*) w migracji `0012`; `CRUX_PRODUCTION_DB_HOSTS` / localhost-only dla seed:demo; NPWZ z prefiksem testowym `99`; `@crux/testing` jako `link:` w modułach (uniknięcie cyklu workspace/turbo).

## 2026-11-25 · K11 · @crux/scheduling: obłożenie godzinowe (F0-010) · część 1–4
Prompt: prompts/F0-fundament.md#K11
Commit: 74cbaf9 · Gałąź: main
Wynik: `db:test` 53 OK (030 occupancy); `@crux/scheduling` 31/31; `doctor` OK z DATABASE_URL; web/i18n typecheck OK. e2e AC9 na seedzie E2E_* (skipped bez env).
Uwagi: migracja `0010` + reset `0011`; EXCLUDE gist + RLS write/write_own; domena OccupancyEntry/DayClosure; usecases z `authorizeWrite` wrapper; UI `/oblozenie` + `/oblozenie/tydzien`; `docs/wzorzec-modulu.md`. F0-010 status „w realizacji” (staging → wdrożona). UI createTimeBlock jeszcze nie.

## 2026-11-25 · K10 · CI, crux-doctor, gen, dependency-cruiser · część 1
Prompt: prompts/F0-fundament.md#K10
Commit: 91f5253 · Gałąź: main
Wynik: `pnpm run doctor` OK (z DB); celowe `as any` wykryte; `pnpm gen module demo` → typecheck OK, usunięty; `lint:deps` 0 errors; typecheck/lint monorepo OK.
Uwagi: CLI przez `pnpm run doctor` (nie `pnpm doctor` — kolizja z built-inem pnpm). Reguły db.* z `--strict-db` w CI; allowlista security definer + pgtap zbiorcze; depcruiser pełny graf docs/01 §4; PR template + gitleaks/audit soft w CI.

## 2026-11-25 · K09 · apps/worker: pg-boss, outbox, harmonogramy, kopie · część 1
Prompt: prompts/F0-fundament.md#K09
Commit: 4ed6ced · Gałąź: main
Wynik: `@crux/worker` test 9/9; typecheck/lint monorepo OK; `db:test` 46 OK; build worker OK.
Uwagi: allowlista `PRIVILEGED_OPERATIONS` + `0009_worker_rls`; outbox claim `FOR UPDATE SKIP LOCKED` + retry 2^n / dead@8; handlery occupancy→analytics.refresh (stub K13); backup AES-GCM + FileStorage lokalny; `/healthz`; `docker-compose.worker.yml`; `tools/restore-test.sh` dokumentacyjny. pg-boss 10.x: `createQueue` + `schedule` + `singletonKey`.

## 2026-11-25 · K08 · @crux/ui: brand, komponenty, wykresy, Storybook · część 1
Prompt: prompts/F0-fundament.md#K08
Commit: b22daa4 · Gałąź: main
Wynik: `storybook build` OK; lint/typecheck/e2e smoke OK.
Uwagi: `brand:sync` + manifest (149 plików); inwentarz 1.0 + model kuleczkowy; `tokens.extra` (`--dane-kulka-pusta`); web na `@crux/ui` (logowanie: `@crux/ui/crux-logo`); ESLint `ui.no-hex`. `test:visual` / `charts-vs-reference.png` — placeholder do K10/CI.

## 2026-11-25 · K07 · logowanie, MFA, blokada, powłoka · część 1
Prompt: prompts/F0-fundament.md#K07
Commit: a4a91e9 · Gałąź: main
Wynik: `pnpm e2e` 3/3 smoke OK (2 auth-flow skipped bez E2E_*); typecheck/lint monorepo OK; `db:test` 46 OK.
Uwagi: AuthPort + SSR adapter; `identity.resolve_actor` (security definer) pod requireActor; AppShell/CruxLogo tymczasowe `TODO(K08)`; brand assets w `apps/web/public`; CSP+proxy; idle lock `CRUX_IDLE_LOCK_MS`. Importy workspace bez `.js` (Turbopack). Pełny MFA e2e po seedzie E2E_EMAIL/PASSWORD/TOTP.

## 2026-11-25 · K06 · @crux/identity + @crux/org: personel, role, gabinety · część 1
Prompt: prompts/F0-fundament.md#K06
Commit: d2a84a6 · Gałąź: main
Wynik: `@crux/identity` test 2/2; `@crux/org` test 1/1; `pnpm db:test` 46 asercji OK (020_org_identity); typecheck/lint monorepo OK.
Uwagi: DDL+RLS w `0005_org`/`0006_identity`; seed uprawnień `0007_role_permissions_seed` (zamiast `manual_`). `createTenant` bez RETURNING (RLS SELECT blokuje nowy id). Drizzle baseline stub. Claims z memberships; `authorize()` na role_permissions.

## 2026-11-25 · K05 · @crux/platform: audyt, outbox, flagi, ustawienia · część 1
Prompt: prompts/F0-fundament.md#K05
Commit: 23e0c2a (+ 3eac620 pgTAP) · Gałąź: main
Wynik: `pnpm --filter @crux/platform` test 6/6; `pnpm db:test` 38 asercji OK; typecheck/lint monorepo OK.
Uwagi: DDL+RLS+`audit.track`/`log_access` w `0004_platform.sql`; Drizzle schema + baseline timestamp (bez duplikatu CREATE). `uuid_generate_v7` z `search_path=extensions` pod pusty path trackera. security definer tylko track + log_access (+ set_reason bez definer).

## 2026-11-25 · K04 · packages/db: Drizzle, withActor, RLS helpers · część 1
Prompt: prompts/F0-fundament.md#K04
Commit: 354ccde · Gałąź: main
Wynik: `pnpm --filter @crux/db` typecheck/lint/test zielone (5 testów integracyjnych); `db:generate` bez diffu (pusty schemat); `db:test` 27 asercji OK. Migracja `0003_tests_reset.sql` (`tests.reset_fixtures`).
Uwagi: claims helpers nadal `extensions.*`. Lokalny DATABASE_URL → port 54322 (pooler 54329 wymaga tenant id Supavisor). `pgPolicy` OK w drizzle-orm 0.45; EXCLUDE → `manual_` gdy potrzeba. Zero service_role / supabase-js.

## 2026-11-25 · K03 · packages/shared: Result, Money, Id, czas, crypto · część 1
Prompt: prompts/F0-fundament.md#K03
Commit: 1fa2494 · Gałąź: main
Wynik: `pnpm --filter @crux/shared` typecheck/lint/test zielone (40 testów); coverage lines 99% / statements 97% dla money+pesel+crypto+pii (≥90%). Monorepo typecheck/lint/test OK.
Uwagi: zależność tylko `zod`/`uuidv7`/`date-fns`/`@date-fns/tz` + `node:crypto`. LocalKeyProvider z `KMS_LOCAL_*` (NIE produkcja). `hourRange` w dniu zmiany czasu (2:00) → zakres zerowy. Subpath exports (`./errors`, `./time`, …) pod K04.

## 2026-11-25 · K02 · Supabase lokalnie i migracja bazowa · część 1
Prompt: prompts/F0-fundament.md#K02
Commit: d028c38 · Gałąź: main
Wynik: `pnpm db:start` / `db:reset` / `db:test` zielone (27 asercji). `extensions.tenant_id()` bez claims = null; `crux_app` nie może `set role postgres`. CLI 3.4 → `config.jsonc` (nie toml); `api.enabled=false`, MFA TOTP on, jwt 12h, signup off, PG 17, bucket `assets`.
Uwagi: claims helpers w **`extensions.*`** (migrator `postgres` nie ma CREATE na `auth`; stockowe `auth.role()` zostaje). Decyzja ADR/synonimy w `auth` otwarta — `docs/ops/supabase-konfiguracja.md`. Hosted staging nie pushowany (`db:push:staging` blokuje).

## 2026-11-25 · K01 · Monorepo i narzędzia · część 1
Prompt: prompts/F0-fundament.md#K01
Commit: 9cf4a95 · Gałąź: main
Wynik: pnpm install / typecheck / lint / test / test:db / doctor / e2e zielone; build @crux/web i @crux/worker OK. Docker: CLI niedostępne w środowisku — Dockerfilei gotowe, `docker build` do potwierdzenia lokalnie.
Uwagi: TypeScript pinned 6.0.3 (7.x poza peer `typescript-eslint <6.1`); `eslint-plugin-boundaries` 7.x flat config OK (reguła `boundaries/dependencies`); `postcss` tylko transitively z `@tailwindcss/postcss`; pnpm przez corepack (`packageManager: pnpm@10.23.0`).

## 2026-11-13 · pakiet marki 1.2 · zielnik 2.0, teksty, prezentacje · bez promptu
Prompt: brak (zmiana w dokumentacji i materiałach marki)
Commit: folder `crux` i `Materialy marki` na dysku wspólnym · Gałąź: brak
Wynik: zielnik 2.0 (42 tablice SVG z folderu „FINAL FINAL”, warianty svg/svg-48px/mech/krem/zielen, `ZIELNIK.md` z katalogiem zastosowań przyciętym do wyrenderowanych roślin, `przeglad.png`); ryciny podmienione w `Materialy marki/ryciny-kohler/`, `Crux - dla tworcow aplikacji/ryciny/`, `manifest/zrodla/marka/ryciny/` (koka → krasnodrzew), manifeście, podręczniku i planszach zespołu (v17); brandbooki zbudowane na nowo z artboardów kanwy jako 1.1 (`Materialy marki/brandbook/zrodla/`); nazwy wydań 3.0 Dąb, 4.0 Gutaperkowiec, 5.0 Brzoza w `07` i `06`; teksty bez konstrukcji „nie X, tylko Y” w docs, specs, prompts, regułach, podręczniku, manifeście, planszach i materiałach marki; jeden system marki dla Kursu na LDEK i produktów ZENIT LABS (`14` 1.2, brandbook BB03); nowy folder `Materialy marki/prezentacje/` (`PREZENTACJE.md`, `szablon-zenit-prezentacja.pptx` z 17 układami i 14 slajdami, źródła szablonu, 16 slajdów decku w HTML, `prompt-dla-bota.md`); fonty statyczne Hanken Grotesk wygenerowane na nowo z poprawnymi nazwami wewnętrznymi (dotąd trzy pliki nazywały się „Hanken Grotesk Regular”), dodane 500 i 700; stare foldery `brandbook/`, `logo/`, `ryciny-kohler/` i zipy 1.0/1.1 w `_archiwum-marka-v1-2026-11-05/`; `zenit-materialy-1.2.zip`
Uwagi: listy „Czym Crux nie jest” i etykiety regulacyjne („podgląd, nie do diagnostyki”) zostawione celowo; rośliny kolornika Z1–Z+ poza cyklem wydań; w PowerPoincie pismo z kolumny pt (18 pt tekst, 40 pt tytuł), wymiary 1 px = 0,5 pt; folder źródłowy „FINAL FINAL ryciny-botaniczne-po-audycie” zostaje na dysku do decyzji właściciela

## 2026-11-06 · wydanie 1.0 „Krasnodrzew” · plan, podręcznik, manifest · bez promptu
Prompt: brak (zmiana w dokumentacji)
Commit: folder `crux` na dysku wspólnym · Gałąź: brak
Wynik: ADR-032 (wydania jako jednostka dostarczania, nazwy z zielnika; 1.0 bez danych pacjentów, produkcja 11.12.2026); `07` 2.1 przepisana (wydania, bramka 1.0, tydzień po tygodniu); `prompts/F0-fundament.md` = wydanie 1.0 w 17 krokach K01–K17 (prompty `P01…` → `K01…`, „Krok n/m” → „Część n/m”); moduł wzorcowy to obłożenie godzinowe foteli (F0-010), zlecenia laboratoryjne (F0-001) przeniesione do 1.1 jako F1#K12; nowe specyfikacje F0-010 i F0-011; `03a` 1.1 (sekcje 5.1, 12.1), `03` 2.1 (ChairOccupancy, macierz ról), `11` 1.2 (metryki i pulpity 1.0, filtr `wykonawca`), `00`, `01`, `04` (5a), `06` 2.2, `09`, `10`, `13`, `README`, `AGENTS`, reguły Cursora; nowe foldery `podrecznik/` (PODRECZNIK-CRUX-1.0 md/html/pdf, `build.py`) i `manifest/` (CRUX-MANIFEST-1.0.pdf, plansze, makiety); plansze zespołu v14
Uwagi: „P1” w rozmowie = wydanie 1.0, w dokumentach = Platforma P1; tor B (opinia prawna, DPIA, DPA) bramkuje 1.1, nie 1.0; pierwsza migracja z `patients` dostaje etykietę `patient-data`; decyzje otwarte w podręczniku, rozdział 9.3; wieczorem ADR-033 (domeny: Crux na `crux.zenitstomatologia.pl`) w `02`, `01` 13, `05`, K17, podręcznik 12.1

## 2026-11-06 · dokumentacja 2.1 · pakiet marki · bez promptu
Prompt: brak (zmiana w dokumentacji)
Commit: folder `crux` na dysku wspólnym · Gałąź: brak
Wynik: `docs/14` dodany (kopia `Materialy marki/GUIDELINE-APLIKACJI.md`), `06` 2.1, `11` 1.1, ADR-031, reguły 30/70, prompty F0-K07/K08/K12 i F3-K03, backlog F0-009, numeracja 01 Nowodworska / 02 Białowieska poprawiona w `README`, `01`, `03`, `03a`, F0-K12, F1-K03, prototypie
Uwagi: przy K08 skopiować pakiet marki do `packages/ui/brand/`; token `--dane-kulka-pusta` do dodania w `Materialy marki/tokeny/tokens.css` (`06`, sekcja 8)

(pierwszy wpis z kodem powstanie po F0-K01)
