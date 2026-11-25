# Changelog

Format: wydanie · nazwa · data. Daty to daty wydania kodu; wdrożenie produkcyjne i bramka operacyjna są opisane osobno ([docs/ops/bramka-1-0.md](docs/ops/bramka-1-0.md)).

## 1.0.1 · Krasnodrzew · niewydane

Poprawki po audycie wydania 1.0 (ledger 2026-11-26).

- Wykonawca zmienia i unieważnia wyłącznie własne wpisy obłożenia (baza i aplikacja).
- Wpis w zamkniętym dniu blokuje baza, nie tylko aplikacja; zamknięcie dnia zostaje w swoim gabinecie.
- Błędy bazy z Drizzle mapują się na właściwe typy (konflikt, odmowa) zamiast błędu technicznego.
- Kopia nocna działa: rola `crux_backup`, wszystkie schematy danych, `pg_dump` 17 (ADR-034).
- Funkcja czyszcząca bazę testową nie trafia na bazy hostowane.
- CI uruchamia się na GitHubie; skan sekretów i audyt zależności blokują scalenie; Storybook i Vite bez znanych podatności high/critical.

## 1.0.0 · Krasnodrzew · 2026-11-25

Data wydania kodu (tag `v1.0.0`). **Planowane wdrożenie produkcyjne: 11.12.2026**; bramka operacyjna mierzona po 10 dniach roboczych wpisów w obu gabinetach.

### Zakres (K01–K17)

- **K01–K02** monorepo (pnpm, Turborepo), CI, Supabase lokalnie i staging, migracja bazowa, pgTAP.
- **K03–K05** `@crux/shared` (Result, Money, Id, czas, kryptografia), `@crux/db` (Drizzle, `withActor`, RLS, harness testów), `@crux/platform` (audyt, outbox, zdarzenia, flagi, ustawienia).
- **K06–K07** `@crux/identity` i `@crux/org` (personel, role, gabinety 01 Nowodworska i 02 Białowieska, fotele, godziny); logowanie, MFA, blokada ekranu, powłoka aplikacji.
- **K08–K10** `@crux/ui` (pakiet marki, komponenty, model kuleczkowy, Storybook), `apps/worker` (pg-boss, outbox, harmonogramy, kopie nocne), CI, `crux-doctor`, generatory, dependency-cruiser.
- **K11–K12** moduł wzorcowy: obłożenie godzinowe foteli (F0-010: siatka, klawiatura, „dzień jak wczoraj”, zamknięcie dnia, unieważnianie wpisów, blokady); fabryki, zestaw wzorcowy, demo.
- **K13–K14** schemat `analytics`, rejestr 7 metryk, zasilanie; pulpity sieci/gabinetu/moje i lista drążenia z eksportem CSV (F0-011).
- **K15–K16** ekrany administracji (organizacja, personel, ustawienia, integracje); obserwowalność bez danych osobowych, procedury operacyjne (`docs/ops/`).
- **K17** skrypt danych startowych produkcji (`pnpm bootstrap:prod`), instrukcje użytkownika (`docs/instrukcje/`), lista obecności, bramka 1.0, reguła `release.no-patient-tables` w `crux-doctor`.

### Znane ograniczenia

- Brak pacjentów i wizyt (ADR-032): wydanie nie przetwarza danych pacjentów; terminarz od 1.1.
- Dane finansowe pochodzą z ręcznie wpisanych kwot obłożenia (tylko godziny z kwotą), nie z należności.
- UI tworzenia blokad czasu fotela jest niepełne.
- Na `/pulpit/moje` porównanie z medianą gabinetu to placeholder.
- Produkcja (Supabase `crux-prod`, Vercel, worker, KMS) i szkolenie są poza repozytorium; bramka operacyjna oczekuje na 10 dni roboczych po go-live.
