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
