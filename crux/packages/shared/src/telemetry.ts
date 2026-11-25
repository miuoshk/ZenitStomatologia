import { SpanStatusCode, trace } from "@opentelemetry/api";

/** Dozwolone atrybuty spanów — wyłącznie identyfikatory i nazwy modułów (ADR-016). */
export type SpanAttrs = {
  readonly "tenant.id"?: string;
  readonly "actor.id"?: string;
  readonly "request.id"?: string;
  readonly "crux.module"?: string;
  readonly "crux.usecase"?: string;
};

/**
 * Lekki span OTel. Bez skonfigurowanego SDK (brak `OTEL_EXPORTER_OTLP_ENDPOINT`)
 * `@opentelemetry/api` zwraca no-op tracer — zero narzutu i zero eksportu.
 * Wyjątek: status ERROR + typ błędu (nie wiadomość, nie stos).
 */
export async function startSpan<T>(
  name: string,
  attrs: SpanAttrs,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer("crux");
  return tracer.startActiveSpan(name, { attributes: attrs }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.setAttribute("error.type", error instanceof Error ? error.name : "unknown");
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Sprawdza, czy OTel ma być włączony (endpoint ustawiony). */
export function otelEnabled(env: Record<string, string | undefined>): boolean {
  return Boolean(env["OTEL_EXPORTER_OTLP_ENDPOINT"]?.trim());
}
