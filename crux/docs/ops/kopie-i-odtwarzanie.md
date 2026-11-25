# Kopie zapasowe i odtwarzanie

**Właściciel:** Bartek (technik) · **Data przeglądu:** 2026-11-25 · **Cel:** zapewnić, że da się odtworzyć bazę po awarii lub błędzie; opis PITR, kopii `pg_dump` i kwartalnego testu odtworzenia (docs/04 sekcja 6, K09).

## Warstwy

| Warstwa | Co | Gdzie | Retencja |
|---|---|---|---|
| PITR (Supabase Pro) | ciągłe WAL | `eu-central-1` | 7 dni (produkcja obowiązkowo) |
| Kopia nocna `backup.nightly` (worker, 02:00) | `pg_dump` (klient ≥ 17) jako rola `crux_backup` schematów `public`, `org`, `identity`, `scheduling`, `platform`, `audit`, `ref`, `analytics` (bez `pgboss`, `tests`), szyfrowanie AES-256-GCM kluczem z `KeyProvider` | `FileStoragePort` (1.0: folder lokalny `BACKUP_LOCAL_DIR`; docelowo magazyn obiektowy UE poza Supabase) | 35 dni + miesięczne 12 mies. (roczna 20 lat od F4) |
| Wpis audytu | `backup.completed` w `audit.events` | baza | zgodnie z audytem |

## Rola kopii `crux_backup` (ADR-034)

Migracja `20261126000300_backup_role.sql` tworzy rolę `crux_backup` jako `NOLOGIN`: tylko `SELECT` na schematach danych, `BYPASSRLS`, bez zapisu. Przed pierwszą kopią na danej bazie:

1. Wygeneruj hasło w menedżerze sekretów.
2. Jako `postgres` (SQL Editor): `alter role crux_backup login password '<hasło>';`
3. Ustaw w workerze `DATABASE_URL_BACKUP=postgresql://crux_backup:<hasło>@db.<projekt>.supabase.co:5432/postgres` (połączenie bezpośrednie, nie pooler transakcyjny).
4. Uruchom kopię ręcznie i sprawdź `backup.completed` w `audit.events` oraz `pg_restore --list` na pliku.

Do 2026-11-25 kopia nocna nie działała: `crux_worker` nie mógł czytać całej bazy przez RLS i brak uprawnień, a lista schematów pomijała `org`, `identity`, `scheduling` (audyt 1.0).

## Cele

- **RPO:** ≤ 5 min (PITR); ≤ 24 h (kopia nocna, scenariusz utraty projektu).
- **RTO:** ≤ 4 h (PITR do nowego projektu + przełączenie `DATABASE_URL`); ≤ 8 h z kopii `pg_dump`.

## Odtwarzanie z PITR

1. Panel Supabase → Database → Backups → Restore (wybierz moment przed awarią).
2. Zweryfikuj role `crux_app` / `crux_worker`, rozszerzenia, `pnpm doctor` na odtworzonej bazie.
3. Przełącz `DATABASE_URL` / `DATABASE_URL_WORKER`; restart web i workera.
4. Zapisz zdarzenie w rejestrze operacyjnym.

## Odtwarzanie z kopii nocnej

1. Pobierz plik `backups/<data>/crux-<data>.dump.aesgcm`, odszyfruj (klucz z KMS — nigdy z repo).
2. `pg_restore` na pustą bazę (`tools/restore-test.sh` automatyzuje to na czystym kontenerze).
3. Migracje do bieżącej wersji, `pnpm doctor`, kontrola liczności tabel.

## Test odtworzenia — co kwartał

1. Uruchom `tools/restore-test.sh` na ostatniej kopii.
2. Sprawdź: schemat, liczności, `audit.events` (łańcuch skrótów), `pnpm doctor`.
3. Wpisz wynik do tabeli:

| Data | Kopia | Wykonał | Czas odtworzenia | Wynik | Uwagi |
|---|---|---|---|---|---|
| _do uzupełnienia przed K17_ | | | | | |

> **Wydanie 1.0:** pierwszy test odtworzenia z kopii **produkcyjnej** musi być wpisany do tabeli powyżej, zanim zamknie się bramka 1.0 ([bramka-1-0.md](bramka-1-0.md), punkt 5).

> Brak testu w ciągu 100 dni = alarm; kopia nieprzetestowana nie jest kopią.
