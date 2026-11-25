/** Nagłówek korelacji żądania (web → logi → audit.events.request_id). */
export const REQUEST_ID_HEADER = "x-request-id";

const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Zwraca przychodzący identyfikator, jeśli ma bezpieczny format (bez spacji, `@` itp. —
 * nie przepuszczamy PII z nagłówków klienta); w przeciwnym razie generuje UUID.
 */
export function resolveRequestId(incoming?: string | null): string {
  const candidate = incoming?.trim();
  if (candidate && SAFE_REQUEST_ID_RE.test(candidate)) return candidate;
  return crypto.randomUUID();
}
