# Zależności npm

Wersja 1.0 · K10 (25 listopada 2026). Każda bezpośrednia zależność musi tu mieć wiersz. `pnpm run doctor` (`deps.documented`) porównuje `package.json` z tą tabelą.

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
| `drizzle-orm` | ORM + `pgPolicy` / schemat TS (ADR-005) | Apache-2.0 | tak (SQL do DB) |
| `drizzle-kit` | generowanie migracji SQL z schematu | MIT | nie |
| `postgres` | klient Postgres (postgres.js) dla Drizzle; `prepare: false` | MIT | tak (SQL do DB) |
| `@supabase/supabase-js` | Auth (logowanie, MFA, admin createUser); bez Data API | MIT | nie (tylko Auth) |
| `@supabase/ssr` | sesja Auth w cookie (proxy + server) | MIT | nie |
| `qrcode` | QR do rejestracji TOTP (MFA) | MIT | nie |
| `drizzle-orm` (w `@crux/web`) | zapytania lokalizacji w layoutcie powłoki | Apache-2.0 | tak (SQL) |
| `@radix-ui/react-dialog` | Dialog, SidePanel, CommandPalette | MIT | nie |
| `@tanstack/react-table` | DataTable | MIT | nie |
| `recharts` | LineChart (motyw marki) | MIT | nie |
| `class-variance-authority` | warianty Button i pokrewnych | Apache-2.0 | nie |
| `clsx` / `tailwind-merge` | `cn()` w `@crux/ui` | MIT | nie |
| `lucide-react` | ikony UI | ISC | nie |
| `react-hook-form` / `@hookform/resolvers` | formularze (PeselInput itd.) | MIT | nie |
| `storybook` + `@storybook/react-vite` + `addon-a11y` | historie komponentów | MIT | nie |
| `@tailwindcss/vite` | Tailwind w Storybook (Vite) | MIT | nie |
| `vite` | bundler Storybook | MIT | nie |
| Hanken Grotesk (SIL OFL) | font lokalny w `packages/ui/brand/fonts` | SIL OFL | nie |
| `pg-boss` | kolejki / cron workera (`apps/worker`, schemat `pgboss`) | MIT | tak (metadane jobów w PG) |
| `pino` | logi JSON workera (bez PII) | MIT | nie |
| `pino-pretty` | czytelne logi workera w dev | MIT | nie |
| `pino` (w `@crux/shared`) | fabryka loggera z allowlistą kluczy i `containsPii` (K16, ADR-016) | MIT | nie (logi bez PII) |
| `@sentry/nextjs` | błędy web (server/edge); **region UE**, `sendDefaultPii: false`, `beforeSend` bez PII, bez session replay; wymaga DPA z Sentry; DSN pusty = wyłączone | MIT | nie — żadnych danych pacjentów w telemetrii |
| `@sentry/node` | błędy workera; jak wyżej | MIT | nie — jw. |
| `@opentelemetry/api` | `startSpan` / no-op tracer w `@crux/shared`; także w roocie, by jedna instancja `drizzle-orm` (peer) | Apache-2.0 | nie |
| `@opentelemetry/sdk-node` | ślady w web i workerze; tylko z `OTEL_EXPORTER_OTLP_ENDPOINT` | Apache-2.0 | nie — atrybuty tylko identyfikatory |
| `@opentelemetry/exporter-trace-otlp-http` | eksport OTLP/HTTP do kolektora w UE lub własnego serwera | Apache-2.0 | nie — jw. |
| `seedrandom` | deterministyczny PRNG dla fabryk i golden datasetu (`@crux/testing`, K12) | MIT | nie |
| `@types/seedrandom` | typy `seedrandom` | MIT | nie |

Telemetria (K16): Sentry wyłącznie w regionie UE z podpisanym DPA (umowa powierzenia); do Sentry/OTel nie trafiają dane pacjentów ani personelu poza identyfikatorami (`user.id`, `tenant.id`, `request.id`). Zob. `docs/ops/sentry-bez-pii.md`.

Transitive (m.in. `postcss` z `@tailwindcss/postcss`) nie wymagają osobnego wiersza, dopóki nie są zależnością bezpośrednią.
