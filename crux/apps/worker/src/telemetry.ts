import { otelEnabled } from "@crux/shared/telemetry";
import { sentryBaseOptions } from "@crux/shared/sentry-before-send";
import * as Sentry from "@sentry/node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

let otel: NodeSDK | null = null;

/**
 * Sentry (EU DSN, bez PII) + OpenTelemetry (tylko przy `OTEL_EXPORTER_OTLP_ENDPOINT`).
 * Puste DSN / endpoint → no-op. Wywołać raz na początku `main`.
 */
export function initTelemetry(env: Record<string, string | undefined> = process.env): void {
  const base = sentryBaseOptions(env);
  const withOtel = otelEnabled(env);
  // Sentry Node domyślnie nie rejestruje providera OTel — nie kłóci się z NodeSDK.
  Sentry.init({
    ...base,
    enabled: base.dsn !== undefined,
  });

  if (withOtel) {
    env["OTEL_SERVICE_NAME"] ??= "crux-worker";
    otel = new NodeSDK({ traceExporter: new OTLPTraceExporter() });
    otel.start();
  }
}

export async function shutdownTelemetry(): Promise<void> {
  await Sentry.close(2000);
  if (otel) await otel.shutdown();
}
