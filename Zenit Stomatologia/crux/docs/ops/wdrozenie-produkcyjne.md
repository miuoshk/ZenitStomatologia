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

## Lista kontrolna wydania 1.0 „Krasnodrzew” (podręcznik 12.4)

- [ ] tag `v1.0.0` z zielonym CI; `pnpm doctor` zielony; `spec.traceability` pełne
- [ ] migracje przetestowane na stagingu z danymi o wolumenie produkcji; okno po 20:00
- [ ] kopia nocna działa; jedno odtworzenie wykonane na pustym kontenerze i opisane ([kopie-i-odtwarzanie.md](kopie-i-odtwarzanie.md))
- [ ] Sentry: testowy błąd na stagingu bez danych osobowych (zrzut w `docs/ops/`, [sentry-bez-pii.md](sentry-bez-pii.md))
- [ ] `/healthz` workera monitorowany; `analytics.refresh` co 5 min widoczny w `refresh_log`
- [ ] dane startowe wgrane (`pnpm bootstrap:prod`, patrz niżej); konta utworzone; hasła jednorazowe przekazane osobiście
- [ ] instrukcje wydrukowane ([docs/instrukcje](../instrukcje/README.md)); szkolenie odbyte; [lista obecności](lista-obecnosci-szkolenie-1-0.md)
- [ ] `CHANGELOG.md`: wpis `1.0.0 · Krasnodrzew` (zakres, znane ograniczenia: brak pacjentów i wizyt, kwoty z wpisów ręcznych)
- [ ] wpis `1.0 · wydanie` w ledgerze
- [ ] bramka operacyjna otwarta: [bramka-1-0.md](bramka-1-0.md) (zamknięcie po 10 dniach roboczych)

## Dane startowe produkcji: `pnpm bootstrap:prod`

Jednorazowy skrypt `tools/bootstrap-prod.ts` (tenant, gabinety 01 i 02 z fotelami i godzinami, personel, ustawienia, flagi). Uruchamia go ręcznie operator z własnego terminala, **raz**.

1. Skopiuj `tools/bootstrap-prod.config.example.json` poza repo, uzupełnij dane z KRS/RPWDL (usuń wszystkie `TODO`, adresy e-mail imienne w domenie `@zenitstomatologia.pl`). Nie commituj wypełnionego pliku.
2. Zmienne: `CRUX_BOOTSTRAP_PROD=1`, `CRUX_PRODUCTION_DB_HOSTS=<host bazy produkcyjnej>`, `CRUX_BOOTSTRAP_CONFIG=<ścieżka>`, `DATABASE_URL` (`crux_app`), `DATABASE_URL_WORKER` (`crux_worker`, odczyt: kontrola istnienia tenanta), `KMS_KEY_ID` (≠ `local-v1`), klucze KMS; opcjonalnie `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (zakładanie kont z hasłem jednorazowym).
3. Najpierw `pnpm bootstrap:prod --dry-run` (waliduje konfigurację i strażników, nic nie zapisuje), potem bez `--dry-run`.
4. Skrypt odmawia dla `localhost` i dla hosta spoza listy; przerywa, jeśli tenant o tej nazwie już istnieje. Nie jest atomowy (tenant i reszta to osobne transakcje): przy błędzie w połowie skontaktuj się z administratorem bazy (ręczne czyszczenie), nie uruchamiaj ponownie na ślepo.
5. Hasła jednorazowe pojawiają się na stdout **jeden raz**: przekaż je osobiście, nie zapisuj w plikach ani w czacie; MFA rejestrowane przy pierwszym logowaniu. Bez `SUPABASE_SECRET_KEY` wiersze personelu powstają, a konta zakłada się w UI (Ustawienia → Personel).
6. Zapisz identyfikatory z podsumowania w `ledger.md` (`1.0 · bootstrap produkcji`), bez haseł.

## Wycofanie

Aplikacja: poprzednia wersja w Vercel (rollback). Baza: tylko migracje wsteczne zgodne z expand/contract; w ostateczności PITR ([kopie-i-odtwarzanie.md](kopie-i-odtwarzanie.md)).
