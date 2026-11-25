# Supabase — lista kontrolna (staging / produkcja)

Wersja 1.0 · K02. Organizacja: **Zenit Stomatologia** (osobna od Zenit Labs). Region: `eu-central-1`. Postgres 17+. ADR-004, ADR-020.

## Projekty

| Środowisko | Projekt | Uwagi |
|---|---|---|
| lokalne | CLI (`supabase start`) | Docker wymagany |
| staging | `crux-staging` | syntetyczne dane |
| produkcja | `crux-prod` | PITR; nigdy klon poza region |

## Plan i kopie

- [ ] Plan **Pro** + **PITR** 7 dni (produkcja obowiązkowo; staging zalecane)
- [ ] Compute: Small (F0–F1), Medium od F2
- [ ] **Team** przed uruchomieniem F4 w gabinecie 01
- [ ] Kopie / PITR w `eu-central-1`; brak klonów produkcyjnych poza region

## Bezpieczeństwo panelu

- [ ] MFA obowiązkowe dla kont z dostępem do panelu
- [ ] Dostęp dla maksymalnie dwóch osób; role per projekt (Team)
- [ ] SSO/MFA organizacji włączone

## Data API / Realtime / Storage

- [ ] **Data API wyłączone** (żaden schemat nie jest eksponowany przez PostgREST) — lokalnie: `api.enabled = false` w `supabase/config.jsonc`
- [ ] Realtime wyłączone
- [ ] Storage: tylko bucket niemedyczny `assets` (medyczne → `FileStoragePort`, ADR-026)
- [ ] Edge Functions nieużywane

## Parametry bazy

- [ ] `log_statement = none` (bez parametrów zapytań)
- [ ] `statement_timeout = 15s` dla roli `authenticated`
- [ ] `idle_in_transaction_session_timeout = 30s`
- [ ] Rozszerzenia: `btree_gist`, `pg_trgm`, `pgcrypto`, `pgaudit` (DDL/role), `pg_cron` (tylko utrzymanie bazy; domena → pg-boss), `pg_stat_statements`
- [ ] Brak Vault / pgsodium jako magazynu kluczy (ADR-025)

## Role aplikacyjne

- [ ] `crux_app` — LOGIN, `in role authenticated`, **bez** `BYPASSRLS`
- [ ] `crux_worker` — LOGIN, osobna rola, **bez** `BYPASSRLS`; operacje tylko z `privileged.ts`
- [ ] Brak użycia `service_role` w kodzie aplikacji

## Claims helpers (K02)

Dokumentacja (`03a`) nazywa funkcje `auth.tenant_id()` itd. Lokalny migrator CLI (rola `postgres`, bez `CREATE` na schemacie `auth` + kolizja ze stockowym `auth.role()`) instaluje je jako **`extensions.tenant_id()`**, `extensions.staff_id()`, `extensions.location_ids()`, `extensions.role()`, `extensions.has_permission(text)`. Stockowe `auth.uid()` / `auth.role()` / `auth.jwt()` zostają nietknięte. Na hostowanym SQL (jako `supabase_admin`) można dociągnąć synonimy w `auth` albo zaktualizować `03a` ADR-em — decyzja otwarta.

## Auth (Supabase Auth)

- [ ] Site URL = `https://crux.zenitstomatologia.pl` (prod) / staging odpowiednik
- [ ] Redirect URLs tylko `crux.` / `crux-staging.`
- [ ] `enable_signup = false`; MFA TOTP włączone; JWT 12 h (`43200`)
- [ ] Publishable key tylko do Auth w przeglądarce; serwer → `withActor` + `DATABASE_URL`

## Po utworzeniu projektu

1. Zastosuj migracje (`pnpm db:push:staging` tylko ręcznie, z `--linked`).
2. Utwórz role `crux_app` / `crux_worker` (hasła w menedżerze sekretów, nie w repo).
3. Zapisz URL-e i klucze w `.env` / Vercel (bez commitowania).
4. Potwierdź w panelu: Data API off, Realtime off, lista schematów API pusta.
