/**
 * Opis operacji workera (K09). Egzekucja allowlisty: `@crux/db` `withWorker`.
 * Każda operacja wymienia tabele, których dotyczy.
 */
export const WORKER_OPERATIONS = {
  "outbox.dispatch": {
    description: "Pobiera pending z platform.outbox i uruchamia handlery tematów",
    tables: ["platform.outbox", "audit.events"],
  },
  "backup.nightly": {
    description: "pg_dump + szyfrowanie + FileStoragePort",
    tables: ["audit.events"],
  },
  "analytics.refresh": {
    description: "Odświeżenie metryk analytics (handler domenowy w K13)",
    tables: ["analytics.*"],
  },
  "integrity.verify": {
    description: "Weryfikacja integralności łańcucha audytu",
    tables: ["audit.integrity_checks", "audit.events"],
  },
  "messages.update_status": {
    description: "Aktualizacja statusów wiadomości (od 1.1)",
    tables: ["platform.outbox"],
  },
  "reminders.schedule": {
    description: "Planowanie przypomnień (od 1.1)",
    tables: ["platform.outbox"],
  },
} as const;

export type WorkerOperationName = keyof typeof WORKER_OPERATIONS;
