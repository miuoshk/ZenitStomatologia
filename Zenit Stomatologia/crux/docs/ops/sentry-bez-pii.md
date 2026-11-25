# Sentry i OpenTelemetry bez danych osobowych

**Właściciel:** Bartek (technik) · **Data przeglądu:** 2026-11-25 · **Cel:** włączyć obserwowalność (ADR-016) i udowodnić, że zdarzenia nie zawierają PII.

## Włączanie (zmienne środowiskowe)

| Zmienna | Znaczenie |
|---|---|
| `SENTRY_DSN` | pusty = Sentry wyłączone (no-op). **Musi** wskazywać projekt w regionie UE (host `*.ingest.de.sentry.io`). Wymaga podpisanego DPA z Sentry. |
| `SENTRY_ENVIRONMENT` | `local` (domyślnie), `staging`, `production` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | pusty = OTel wyłączone. Ustaw tylko na kolektor w UE lub własny serwer (Tempo/Grafana). |
| `OTEL_SERVICE_NAME` | opcjonalnie; domyślnie `crux-web` / `crux-worker` |
| `LOG_LEVEL` | poziom logów pino |

Stałe w kodzie (nie do zmiany env): `sendDefaultPii: false`, brak session replay, brak Sentry w przeglądarce, `tracesSampleRate: 0` (ślady idą przez OTel), filtr `scrubSentryEvent` (usuwa dane żądania, nagłówki, cookies, `extra`; `user` tylko `{ id }`; treść wyjątków z PII → `[REDACTED]`).

Atrybuty spanów OTel: wyłącznie `tenant.id`, `actor.id`, `request.id`, `crux.module`, `crux.usecase`.

## Weryfikacja na stagingu

1. Ustaw `SENTRY_DSN` (UE) i `SENTRY_ENVIRONMENT=staging`.
2. Wywołaj kontrolowany błąd (np. tymczasowy route rzucający `Error("test k16")` albo `Sentry.captureException`) z zalogowanego konta.
3. W Sentry otwórz zdarzenie i sprawdź: brak zakładek Request body/Cookies/Headers, `User` ma tylko `id`, brak e-maila/IP/nazwy, breadcrumbs bez danych, wiadomość bez PII.
4. Zrzut ekranu: `docs/ops/img/sentry-staging-event.png` _(placeholder — do wykonania po utworzeniu projektu Sentry UE; wymaga prawdziwego DSN)_.
5. Zweryfikuj, że log workera z tym samym `requestId` nie zawiera PII (`logger.redacted` w logach = ktoś próbował zalogować pole spoza allowlisty — popraw kod).
6. Wpis w rejestrze: data, osoba, wynik.

## Test automatyczny

`pnpm --filter @crux/shared test` — `logger.test.ts` (allowlista + `logger.redacted`), `sentry-before-send.test.ts` (filtr), `telemetry.test.ts` (no-op bez SDK).
