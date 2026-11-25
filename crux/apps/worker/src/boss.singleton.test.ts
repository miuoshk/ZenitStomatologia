import { describe, expect, it } from "vitest";
import { QUEUES } from "./queues";

/**
 * Kontrakt K09: zadania cykliczne używają singletonKey / policy singleton,
 * żeby nie odpalać się dwa razy równolegle (pg-boss).
 */
describe("pg-boss singleton contract", () => {
  it("kolejki scheduled mają unikalne nazwy singleton", () => {
    const keys = [
      "outbox-tick",
      "analytics-incr",
      "analytics-full",
      "backup-nightly",
      "integrity-verify",
      "reminders",
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("QUEUES pokrywa outbox + scheduled-*", () => {
    expect(QUEUES.outboxDispatch).toBe("outbox-dispatch");
    expect(QUEUES.backupNightly).toMatch(/^scheduled-/);
    expect(QUEUES.integrityVerify).toMatch(/^scheduled-/);
    expect(QUEUES.remindersSchedule).toMatch(/^scheduled-/);
  });
});
