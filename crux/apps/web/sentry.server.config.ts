import { sentryBaseOptions } from "@crux/shared/sentry-before-send";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry po stronie serwera (ADR-016): bez PII, bez replay, DSN w regionie UE.
 * Pusty `SENTRY_DSN` → SDK wyłączone (no-op).
 */
const base = sentryBaseOptions(process.env);
Sentry.init({
  ...base,
  enabled: base.dsn !== undefined,
  // Sentry (Next) domyślnie rejestruje własnego providera OTel; przy własnym NodeSDK — nie.
  ...(process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]?.trim()
    ? { enableOpenTelemetrySetup: false }
    : {}),
});
