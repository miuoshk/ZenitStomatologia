# Wdrożenie produkcyjne

**Właściciel:** Bartek (technik) · **Data przeglądu:** 2026-11-25 · **Cel:** powtarzalne, bezpieczne wdrożenie bez przestoju w godzinach pracy gabinetów.

## Okno

Wdrożenia produkcyjne **po 20:00** (czasu Europe/Warsaw), do czasu potwierdzenia, że migracje przechodzą bez przestojów (docs/01, sekcja 9). Migracje zawsze expand → migrate → contract.

## Przed wdrożeniem

- [ ] CI zielone: `pnpm typecheck`, `lint`, `lint:deps`, `test`, `test:db`, `doctor`, `e2e`
- [ ] Migracje przetestowane na stagingu (`pnpm db:push:staging`), bez edycji starych migracji
- [ ] Zmiany destrukcyjne mają etykietę `destructive-migration` i plan expand/contract
- [ ] Świeża kopia: ostatni `backup.completed` < 24 h; PITR aktywny
- [ ] Zmienne środowiskowe: `DATABASE_URL`, `DATABASE_URL_WORKER`, `SUPABASE_*`, `KMS_*` (produkcyjne, nie lokalne), `SENTRY_DSN` (**region UE**), `SENTRY_ENVIRONMENT=production`, opcjonalnie `OTEL_EXPORTER_OTLP_ENDPOINT` (UE / własny serwer)
- [ ] Brak danych pacjentów (1.0): `doctor` potwierdza brak tabel `patients*`
- [ ] Poinformowano gabinety (jeśli okno wpływa na pracę)

## Wdrożenie

1. Tag wydania; CI uruchamia migracje (`db:push` z taga).
2. Wdrożenie web (Vercel, `fra1`), potem worker (`docker-compose.worker.yml`).
3. Sprawdź `/healthz` workera i stronę logowania.

## Po wdrożeniu

- [ ] Logowanie + MFA, widok obłożenia, zapis i unieważnienie wpisu testowego
- [ ] `x-request-id` w odpowiedzi; wpis audytu ma `request_id`
- [ ] Sentry: brak nowych błędów 15 min; zdarzenia bez PII ([sentry-bez-pii.md](sentry-bez-pii.md))
- [ ] Kolejki workera działają (`outbox-dispatch`, `backup.nightly` w harmonogramie)

## Wycofanie

Aplikacja: poprzednia wersja w Vercel (rollback). Baza: tylko migracje wsteczne zgodne z expand/contract; w ostateczności PITR ([kopie-i-odtwarzanie.md](kopie-i-odtwarzanie.md)).
