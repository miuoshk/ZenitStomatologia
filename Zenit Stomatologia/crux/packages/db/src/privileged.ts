/**
 * Jedyna lista operacji uprzywilejowanych workera (rozszerzana w kolejnych K).
 * `withWorker` odrzuca nazwę spoza tej listy.
 */
export const PRIVILEGED_OPERATIONS = [
  "outbox.dispatch",
  "analytics.refresh",
  "integrity.check",
  "access_log.write",
  "seed.fixture",
] as const;

export type PrivilegedOperation = (typeof PRIVILEGED_OPERATIONS)[number];

export function isPrivilegedOperation(
  operation: string,
  allowed: ReadonlySet<string> = new Set(PRIVILEGED_OPERATIONS),
): boolean {
  return allowed.has(operation);
}
