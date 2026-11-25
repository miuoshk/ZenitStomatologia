# Zależności npm

Wersja 1.0 · K03 (25 listopada 2026). Każda bezpośrednia zależność musi tu mieć wiersz. `crux-doctor` porównuje `package.json` z tą tabelą (K10).

| Pakiet | Po co | Licencja | Dane pacjentów |
|---|---|---|---|
| `next` | aplikacja web (App Router) | MIT | nie |
| `react` | UI | MIT | nie |
| `react-dom` | renderowanie React w przeglądarce | MIT | nie |
| `typescript` | typowanie całego monorepo (pinned 6.0.3; 7.x czeka na peer `typescript-eslint`) | Apache-2.0 | nie |
| `@types/node` | typy Node 22 | MIT | nie |
| `@types/react` | typy React | MIT | nie |
| `@types/react-dom` | typy React DOM | MIT | nie |
| `eslint` | lint flat config | MIT | nie |
| `typescript-eslint` | reguły TS (strict-type-checked) | MIT | nie |
| `eslint-plugin-boundaries` | granice warstw modułów | MIT | nie |
| `eslint-plugin-import-x` | reguły importów | MIT | nie |
| `prettier` | formatowanie | MIT | nie |
| `turbo` | orchestracja zadań monorepo | MIT | nie |
| `vitest` | testy jednostkowe / workspace | MIT | nie |
| `@vitest/coverage-v8` | pokrycie testów | MIT | nie |
| `playwright` | przeglądarki do e2e (przez `@playwright/test`) | Apache-2.0 | nie |
| `@playwright/test` | e2e | Apache-2.0 | nie |
| `tsx` | uruchamianie TS w workerze (dev) | MIT | nie |
| `tsup` | build workera | MIT | nie |
| `dependency-cruiser` | graf zależności modułów | MIT | nie |
| `tailwindcss` | style (v4) | MIT | nie |
| `@tailwindcss/postcss` | integracja Tailwind z PostCSS / Next | MIT | nie |
| `supabase` | CLI lokalne (init/start/test/migrate) | MIT | nie |
| `zod` | schematy i walidacja wejścia (`Id`, `PlainDate`) | MIT | nie |
| `uuidv7` | generowanie identyfikatorów UUIDv7 (`newId`) | Apache-2.0 | nie |
| `date-fns` | formatowanie dat/czasu w `@crux/shared/time` | MIT | nie |
| `@date-fns/tz` | strefa `Europe/Warsaw`, DST (`TZDate`) | MIT | nie |

Transitive (m.in. `postcss` z `@tailwindcss/postcss`) nie wymagają osobnego wiersza, dopóki nie są zależnością bezpośrednią.
