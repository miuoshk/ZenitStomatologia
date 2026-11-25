import { otelEnabled } from "@crux/shared/telemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

let started = false;

/** OTel dla web (Node runtime) — tylko z `OTEL_EXPORTER_OTLP_ENDPOINT`; inaczej no-op. */
export function startWebTelemetry(env: Record<string, string | undefined> = process.env): void {
  if (started || !otelEnabled(env)) return;
  started = true;
  env["OTEL_SERVICE_NAME"] ??= "crux-web";
  new NodeSDK({ traceExporter: new OTLPTraceExporter() }).start();
}
