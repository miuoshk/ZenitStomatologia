import type { CruxDb } from "@crux/db";
import type { Logger } from "../logger";

/** Stub — przypomnienia od wydania 1.1. */
export async function runRemindersSchedule(db: CruxDb, log: Logger): Promise<void> {
  await db.withWorker("reminders.schedule", () => {
    log.info({ operation: "reminders.schedule" }, "reminders.schedule noop (1.1+)");
    return Promise.resolve();
  });
}
