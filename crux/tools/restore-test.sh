#!/usr/bin/env bash
# Test odtworzenia kopii (K09) — lokalny Postgres 17 w Dockerze.
# Wejście: ścieżka do custom dump LUB DATABASE_URL_BACKUP / ~/.config/crux/DATABASE_URL_BACKUP.prod
# (dla .aesgcm z workera: najpierw odszyfruj kluczem KMS_*).
set -euo pipefail

DUMP="${1:-/tmp/crux-restore-test.dump}"
CONTAINER="${CRUX_RESTORE_CONTAINER:-crux-restore-test}"
PORT="${CRUX_RESTORE_PORT:-55432}"

echo "restore-test.sh · docs/ops/kopie-i-odtwarzanie.md"

if [[ ! -f "$DUMP" ]]; then
  URL_FILE="${DATABASE_URL_BACKUP_FILE:-$HOME/.config/crux/DATABASE_URL_BACKUP.prod}"
  if [[ -z "${DATABASE_URL_BACKUP:-}" && -f "$URL_FILE" ]]; then
    DATABASE_URL_BACKUP="$(cat "$URL_FILE")"
  fi
  if [[ -z "${DATABASE_URL_BACKUP:-}" ]]; then
    echo "Brak dumpu i DATABASE_URL_BACKUP — podaj plik .dump albo ustaw URL." >&2
    exit 1
  fi
  echo "1. pg_dump → $DUMP"
  if ! pg_dump "$DATABASE_URL_BACKUP" \
    --format=custom --no-owner --no-acl \
    --schema=public --schema=org --schema=identity --schema=scheduling \
    --schema=platform --schema=audit --schema=ref --schema=analytics \
    -f "$DUMP"; then
    echo "Direct dump nieudany — spróbuj ręcznie przez pooler sesyjny :5432 (docs/ops/kopie-i-odtwarzanie.md)." >&2
    exit 1
  fi
fi

echo "2. Kontener Postgres 17"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=restore_only -p "${PORT}:5432" postgres:17 >/dev/null
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

export PGPASSWORD=restore_only
for _ in $(seq 1 40); do
  psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -tAc 'select 1' 2>/dev/null | grep -qx 1 && break
  sleep 1
done

echo "3. Stub ról i extensions (foundation-lite)"
psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role crux_app login nosuperuser; exception when duplicate_object then null; end $$;
do $$ begin create role crux_worker login nosuperuser; exception when duplicate_object then null; end $$;
do $$ begin create role crux_backup nologin bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist;
create or replace function extensions.uuid_generate_v7() returns uuid
  language sql as $$ select gen_random_uuid() $$;
create or replace function extensions.tenant_id() returns uuid
  language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::json->>'tenant_id')::uuid
  $$;
create or replace function extensions.staff_id() returns uuid
  language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::json->>'staff_id')::uuid
  $$;
create or replace function extensions.location_ids() returns uuid[]
  language sql stable as $$
    select coalesce(
      (select array_agg(x::uuid)
         from json_array_elements_text(
           coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->'location_ids', '[]'::json)
         ) t(x)),
      '{}'::uuid[]
    )
  $$;
create or replace function extensions.has_permission(p text) returns boolean
  language sql stable as $$ select false $$;
create or replace function extensions.role() returns text
  language sql stable as $$ select '' $$;
create or replace function extensions.worker_operation() returns text
  language sql stable as $$ select coalesce(current_setting('crux.worker_operation', true), '') $$;
SQL

echo "4. pg_restore"
set +e
pg_restore -h 127.0.0.1 -p "$PORT" -U postgres -d postgres \
  --clean --if-exists --no-owner --no-acl "$DUMP"
set -e

echo "5. Liczności (porównaj z produkcją)"
psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres <<'SQL'
select 'tenants' as t, count(*)::int as n from org.tenants
union all select 'staff', count(*)::int from identity.staff_members
union all select 'occupancy', count(*)::int from scheduling.chair_occupancy
union all select 'audit_events', count(*)::int from audit.events
order by 1;
SQL

echo "OK — wpisz wynik do docs/ops/kopie-i-odtwarzanie.md. Kontener zostanie usunięty."
unset PGPASSWORD
