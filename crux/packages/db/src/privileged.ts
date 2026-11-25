/**
 * Jedyna lista operacji uprzywilejowanych workera (ADR-009 / K09).
 * `withWorker` odrzuca nazwę spoza tej listy.
 */
export const PRIVILEGED_OPERATIONS = [
  "outbox.dispatch",
  "backup.nightly",
  "analytics.refresh",
  "integrity.verify",
  "messages.update_status",
  "reminders.schedule",
  /** Harness / testy lokalne. */
  "seed.fixture",
  "access_log.write",
] as const;

export type PrivilegedOperation = (typeof PRIVILEGED_OPERATIONS)[number];

export function isPrivilegedOperation(
  operation: string,
  allowed: ReadonlySet<string> = new Set(PRIVILEGED_OPERATIONS),
): boolean {
  return allowed.has(operation);
}
