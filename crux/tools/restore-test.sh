#!/usr/bin/env bash
# Ręczny test odtworzenia kopii nocnej (K09) — raz na kwartał.
# Wejście: zaszyfrowany dump (CRUXB1 + AES-256-GCM) z BACKUP_LOCAL_DIR.
# Wymaga: pg_restore, openssl/node, pusty kontener Postgres.
set -euo pipefail

echo "restore-test.sh · dokumentacja: prompts/F0-fundament.md#K09"
echo "1. Odszyfruj plik .dump.aesgcm kluczem z KeyProvider (KMS_*)."
echo "2. Uruchom pusty Postgres 17 (docker run postgres:17)."
echo "3. pg_restore -d \$DATABASE_URL --clean --if-exists dump.pliki"
echo "4. Sprawdź: select count(*) from platform.outbox; pnpm db:test"
echo "Pełna automatyzacja — backlog ops (nie w CI 1.0)."
exit 0
