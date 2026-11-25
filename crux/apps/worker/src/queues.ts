/** Nazwy kolejek pg-boss (K09). */
export const QUEUES = {
  outboxDispatch: "outbox-dispatch",
  analyticsRefresh: "scheduled-analytics-refresh",
  analyticsRefreshFull: "scheduled-analytics-refresh-full",
  backupNightly: "scheduled-backup-nightly",
  integrityVerify: "scheduled-integrity-verify",
  remindersSchedule: "scheduled-reminders",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
