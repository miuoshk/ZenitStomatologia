# Hosting workera Crux (UE)

**Właściciel:** Bartek (technik) · **Cel:** kontener `apps/worker` na serwerze w UE (ADR-009, ADR-012: Hetzner Falkenstein/Norymberga lub OVHcloud). Bez workera nie ma outboxa, `analytics.refresh` ani kopii nocnej.

## Stan 2026-11-26

- Rola `crux_backup` na produkcji: LOGIN + hasło u operatora (`~/.config/crux/`).
- `DATABASE_URL_BACKUP` (direct `db.<ref>.supabase.co:5432`) — lokalnie u operatora, **nigdy** w Vercel web.
- **Brak** VPS/konta cloud z CLI w tym środowisku → worker produkcyjny jeszcze nie wystartowany.

## Co przygotować na VPS (UE)

1. Maszyna 2 vCPU / 4 GB, Debian 12+, Docker + Compose, dysk pod `BACKUP_LOCAL_DIR` (≥ 20 GB).
2. Skopiuj `docker-compose.worker.yml` i zbuduj z korzenia monorepo (`crux/`).
3. Env (tylko na serwerze workera):

| Zmienna | Uwagi |
|---|---|
| `DATABASE_URL_WORKER` | pooler sesyjny lub direct, rola `crux_worker` |
| `DATABASE_URL_BACKUP` | **direct** 5432, rola `crux_backup` (plik operatora) |
| `KMS_*` | te same co produkcja web (nie `local-v1` na dłużej) |
| `BACKUP_LOCAL_DIR` | `/data/backups` (volume) |
| `FAKE_INTEGRATIONS` | `0` |
| `SENTRY_ENVIRONMENT` | `production` |
| `WORKER_HEALTH_PORT` | `8081` |

4. `docker compose -f docker-compose.worker.yml up -d`
5. Sprawdź `http://127.0.0.1:8081/healthz` (firewall: tylko monitoring / VPN).
6. Po pierwszej nocy: wpis `backup.completed` w `audit.events` + test `tools/restore-test.sh`.

## Zakaz

- Nie ustawiaj `DATABASE_URL_BACKUP` w projekcie Vercel web.
- Nie wystawiaj portu bazy ani workera publicznie bez TLS i ograniczenia IP.
