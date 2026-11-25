# `@crux/db`

Jedyny dostęp do Postgresa z kodu: Drizzle + `withActor` / `withWorker` (ADR-005).

## Klient

```ts
import { createDb, withActor, withWorker } from "@crux/db";

const app = createDb(process.env.DATABASE_URL!, { role: "app" });
await withActor(app, actor, async (tx) => {
  // SET LOCAL ROLE authenticated + request.jwt.claims + statement_timeout 15s
});

const worker = createDb(process.env.DATABASE_URL_WORKER!, { role: "worker" });
await withWorker(worker, "outbox.dispatch", async (tx) => {
  // claims: { worker: true, operation }
});
```

- Zero `service_role`, zero `supabase-js` po stronie serwera.
- Claims helpers w SQL: `extensions.tenant_id()` itd. (K02; nie `auth.*`).
- Pula: `max` 10 (app) / 5 (worker); `prepare: false` pod Supavisor.

## Schemat i migracje

Źródło prawdy: `src/schema/` (Drizzle). Helpery: `tenantColumns()`, `mutableColumns()`, `rls.*`, `tableComment()`.

```bash
pnpm db:generate   # drizzle-kit generate → supabase/migrations/<timestamp>_*.sql
pnpm db:reset      # supabase db reset (stosuje wszystkie migracje)
pnpm db:test       # pgTAP
```

### Migracje ręczne

1. Plik w `supabase/migrations/` z prefiksem **`manual_`** (np. `manual_20261125_uuid_helpers.sql`) albo kolejny numer `000N_…` dla fundamentu.
2. Funkcje, triggery, `EXCLUDE`, granty — tylko SQL ręczny (nie generuj ich z Drizzle, jeśli brak wsparcia).
3. **Nie edytuj** już scalonych migracji — dodaj nową.
4. Po `db:generate` zawsze przeglądaj SQL przed PR.

### EXCLUDE / złożone polityki

Drizzle 0.45 wspiera `pgPolicy`. Więzy `EXCLUDE` i nietypowe triggery → migracja `manual_`; w schemacie TS zostaw komentarz z odnośnikiem.

## Testy integracyjne

Wymagają `pnpm db:start` (lokalny Supabase). Harness: `createTestDb()`, `withTestTenant()`, `resetBetweenTests()`, `actorFor()`.

```bash
pnpm test --filter @crux/db
```

Lokalnie używaj portu **54322** (bezpośredni). Pooler `54329` w CLI wymaga identyfikatora tenanta Supavisor.
