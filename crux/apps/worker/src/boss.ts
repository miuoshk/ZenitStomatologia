import PgBoss from "pg-boss";
import { QUEUES } from "./queues";
import type { Logger } from "./logger";

const TZ = "Europe/Warsaw";

export type Boss = PgBoss;

/**
 * pg-boss na DATABASE_URL_WORKER, schemat `pgboss`.
 * Kolejki + cron (singletonKey → brak równoległych uruchomień).
 */
export async function startBoss(connectionString: string, log: Logger): Promise<Boss> {
  const boss = new PgBoss({
    connectionString,
    schema: "pgboss",
    application_name: "crux-worker",
    schedule: true,
  });

  boss.on("error", (error: Error) => {
    log.error({ err: error.message, operation: "pg-boss" }, "pg-boss error");
  });

  await boss.start();

  for (const name of Object.values(QUEUES)) {
    await boss.createQueue(name, { name, policy: "singleton" });
  }

  // Outbox: tick co ~5 s (self-reschedule + singletonKey).
  await boss.send(
    QUEUES.outboxDispatch,
    {},
    { singletonKey: "outbox-tick", singletonSeconds: 5 },
  );

  await boss.schedule(
    QUEUES.analyticsRefresh,
    "*/5 * * * *",
    { mode: "incremental" },
    { tz: TZ, singletonKey: "analytics-incr" },
  );
  await boss.schedule(
    QUEUES.analyticsRefreshFull,
    "10 2 * * *",
    { mode: "full" },
    { tz: TZ, singletonKey: "analytics-full" },
  );
  await boss.schedule(
    QUEUES.backupNightly,
    "0 2 * * *",
    {},
    { tz: TZ, singletonKey: "backup-nightly" },
  );
  await boss.schedule(
    QUEUES.integrityVerify,
    "0 3 * * *",
    {},
    { tz: TZ, singletonKey: "integrity-verify" },
  );
  await boss.schedule(
    QUEUES.remindersSchedule,
    "*/10 * * * *",
    {},
    { tz: TZ, singletonKey: "reminders" },
  );

  log.info({ operation: "pg-boss", status: "started" }, "pg-boss started");
  return boss;
}

export async function stopBoss(boss: Boss): Promise<void> {
  await boss.stop({ graceful: true, timeout: 15_000 });
}
