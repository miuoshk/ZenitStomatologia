import * as Sentry from "@sentry/nextjs";

/**
 * Next 16: hook instrumentacji. Sentry (server/edge) + OTel (tylko Node, z endpointem).
 * Klient (przeglądarka) celowo bez Sentry: błędy UI mogą zawierać tekst ekranu (ADR-016).
 */
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    await import("./sentry.server.config");
    const { startWebTelemetry } = await import("./server/telemetry");
    startWebTelemetry();
  }
  if (process.env["NEXT_RUNTIME"] === "edge") {
    await import("./sentry.edge.config");
  }
}

/** Błędy żądań → Sentry (filtr `beforeSend` usuwa dane żądania i PII). */
export const onRequestError = Sentry.captureRequestError;
