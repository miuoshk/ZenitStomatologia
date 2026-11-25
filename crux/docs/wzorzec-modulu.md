# Wzorzec modułu — obłożenie godzinowe (`@crux/scheduling`)

Wersja 1.0 · po K11. Kopiuj tę strukturę przy każdym nowym module (F1 kartoteka, F0-001 lab, …). Specyfikacja wzorca: `docs/specs/F0-010-oblozenie-godzinowe.md`.

## Dlaczego ten moduł

Obłożenie jest celowo proste: **brak pacjenta, brak statusów workflow, brak integracji zewnętrznych**. Pokazuje czysty szkielet: migracja → domena → przypadki użycia → ekran → zdarzenia → (później analityka). Nie kopiuj rzeczy, których wzorzec nie ma — dodawaj je dopiero, gdy spec tego wymaga.

## Kolejność budowy

1. Spec + AC z tagami `[F0-xxx/ACn]` w testach.
2. Migracja SQL + RLS + trigger `audit.track` + pgTAP.
3. Drizzle schema w `packages/db`.
4. Domena (`Result`, reguły, `FixedClock`, bez `new Date()`).
5. Przypadki użycia (Zod, `commandId`, `authorize`, `publishEvent`).
6. UI (RSC + server actions + i18n PL) + e2e klawiatury.
7. README modułu + wpis w ledger + commit.

Generator: `pnpm gen module <name>` (szkielet), potem ręcznie uzupełnij jak poniżej.

## Lista plików do skopiowania / odtworzenia

| Warstwa | Wzorzec (obłożenie) | Co zmieniasz |
|---|---|---|
| Migracja | `supabase/migrations/0010_scheduling_occupancy.sql` | schemat, tabele, RLS, CHECK, EXCLUDE |
| pgTAP | `supabase/tests/030_scheduling_occupancy.sql` | AC RLS / więzy |
| reset fixtures | `supabase/migrations/0011_tests_reset_scheduling.sql` | truncate nowych tabel |
| Drizzle | `packages/db/src/schema/scheduling.ts` | kolumny = migracja |
| Domena | `packages/modules/scheduling/src/domain/chair-occupancy.ts` (+ `.test.ts`) | reguły biznesowe |
| Usecases | `packages/modules/scheduling/src/application/*.ts` (+ `occupancy.test.ts`) | Zod, authorize, outbox |
| Public API | `src/index.ts`, `permissions.ts`, `events.ts` | eksporty |
| Zdarzenia | `packages/modules/platform/src/events/registry.ts` | tematy + Zod payload (tylko ID) |
| Uprawnienia | seed `role_permissions` (już w K06 dla occupancy.*) | macierz ról |
| UI | `apps/web/app/(app)/oblozenie/` | ścieżka PL, siatka/lista |
| i18n | `packages/i18n/src/pl/occupancy.ts` | teksty PL |
| e2e | `apps/web/e2e/oblozenie.spec.ts` | `[ID/ACn]`, seed E2E_* |
| Docs | `packages/modules/scheduling/README.md`, ten plik | opis + AC |

## Kontrakty, których nie łamiesz

- **Granice pakietów** (`docs/01` §4): import tylko publicznych `@crux/*`; brak głębokich ścieżek do cudzego `src/`.
- **`authorize(tx, actor, perm, { locationId? })`** w każdym use-case z `Actor` (albo cienki wrapper, np. `authorizeWrite` → `authorize`).
- **`commandId` + `recordCommand`** na zapisach; zdarzenia przez `publishEvent` z rejestru.
- **RLS `tenant_location`** (lub `tenant_all` gdy sieć); brak `service_role` w aplikacji.
- **Czas:** `@crux/shared/time` (`hourRange`, `FixedClock`); zero `new Date()` w domenie/usecase.
- **Pieniądze:** grosze (`bigint`), format PL w UI.
- **PII:** notatki przez `containsPii`; w 1.0 zero pól pacjenta.
- **Testy:** tag `[SpecId/ACn]`; doctor `spec.traceability` wymaga ich dla statusu „w realizacji” / „wdrożona”.

## Gdzie wzorzec jest celowo prostszy

| Temat | W obłożeniu | W module z pacjentem / statusami |
|---|---|---|
| Pacjent | brak | FK + `logAccess`, etykieta migracji `patient-data` |
| Statusy | void / close day | maszyna stanów + przejścia w domenie |
| Integracje | outbox → stub worker | handlery zewnętrzne, dead-letter UI |
| Analityka | fakty od K13 | ten sam outbox → `analytics.refresh` |
| UI | siatka godzin + tydzień | kartoteka, lista, panel boczny |

## Szybki checklist nowego modułu

- [ ] Migracja + `pnpm db:test` (pgTAP AC izolacji i więzów)
- [ ] Domena + testy jednostkowe (DST jeśli czas)
- [ ] Usecases + testy integracyjne z `@crux/db/testing`
- [ ] Tematy w event registry
- [ ] Ekran PL + i18n + e2e z tagiem AC
- [ ] `pnpm run doctor` (z `DATABASE_URL`) zielony
- [ ] README modułu, status speku, ledger, commit
