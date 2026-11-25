# Kwartalny przegląd zależności

**Właściciel:** Bartek (technik) · **Data przeglądu:** 2026-11-25 · **Cel:** utrzymać zależności aktualne i bezpieczne oraz pilnować, by żadna nowa nie przetwarzała danych osobowych poza UE bez ADR i umowy powierzenia.

## Co kwartał

1. `pnpm outdated -r` oraz `pnpm audit --prod`; krytyczne podatności — natychmiast, poza harmonogramem.
2. Przegląd [docs/zaleznosci.md](../zaleznosci.md): czy każda zależność bezpośrednia ma wpis (licencja, dane pacjentów: nie).
3. Aktualizacje paczkami tematycznymi (Next/React, Drizzle/Postgres, Sentry/OTel, narzędzia); wersje **przypięte dokładnie** (`save-exact`).
4. Po aktualizacji: `pnpm typecheck && pnpm lint && pnpm lint:deps && pnpm test && pnpm test:db && pnpm doctor && pnpm e2e`.
5. Sentry/OTel: sprawdź, że nadal obowiązuje region UE, `sendDefaultPii: false`, brak session replay, a `beforeSend` jest testowany (`pnpm --filter @crux/shared test`).
6. Zweryfikuj, czy dostawcy (Supabase, Vercel, Sentry) nie zmienili regionów/podprzetwarzających; aktualizuj DPA.
7. Zapisz wynik w tabeli.

| Data | Wykonał | Podatności | Zaktualizowano | Uwagi |
|---|---|---|---|---|
| _pierwszy przegląd: Q1 2027_ | | | | |
