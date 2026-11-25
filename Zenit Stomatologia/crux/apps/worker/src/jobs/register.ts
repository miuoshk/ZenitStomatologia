import type { CruxDb } from "@crux/db";
import type { FileStoragePort } from "@crux/integrations";
import type { Boss } from "../boss";
import { dispatchOutboxBatch } from "../dispatch/outbox";
import type { Logger } from "../logger";
import { QUEUES } from "../queues";
import type { TopicHandlerContext } from "../topics/types";
import { runAnalyticsRefresh } from "./analytics-refresh";
import { runBackupNightly } from "./backup-nightly";
import { runIntegrityVerify } from "./integrity-verify";
import { runRemindersSchedule } from "./reminders-schedule";

export type WorkerRuntime = {
  readonly boss: Boss;
  readonly db: CruxDb;
  readonly log: Logger;
  readonly storage: FileStoragePort;
};

/** Rejestruje handlery kolejek pg-boss. */
export async function registerJobs(rt: WorkerRuntime): Promise<void> {
  const { boss, db, log, storage } = rt;

  const enqueueAnalyticsRefresh: TopicHandlerContext["enqueueAnalyticsRefresh"] = async (
    input,
  ) => {
    await boss.send(
      QUEUES.analyticsRefresh,
      input,
      { singletonKey: `analytics:${input.locationId}:${input.day}`, singletonSeconds: 60 },
    );
  };

  const ctxBase: Omit<TopicHandlerContext, "db"> = {
    log,
    enqueueAnalyticsRefresh,
  };

  await boss.work(QUEUES.outboxDispatch, async () => {
    await dispatchOutboxBatch(db, ctxBase);
    await boss.send(
      QUEUES.outboxDispatch,
      {},
      { startAfter: 5, singletonKey: "outbox-tick", singletonSeconds: 5 },
    );
  });

  await boss.work(QUEUES.analyticsRefresh, async ([job]) => {
    const data = (job?.data ?? {}) as {
      tenantId?: string;
      locationId?: string;
      day?: string;
    };
    if (data.tenantId && data.locationId && data.day) {
      await runAnalyticsRefresh(db, log, {
        tenantId: data.tenantId,
        locationId: data.locationId,
        day: data.day,
      });
    } else {
      log.info({ queue: QUEUES.analyticsRefresh }, "analytics.refresh cron stub");
      await db.withWorker("analytics.refresh", async () => Promise.resolve());
    }
  });

  await boss.work(QUEUES.analyticsRefreshFull, async () => {
    log.info({ queue: QUEUES.analyticsRefreshFull }, "analytics.refresh full stub");
    await db.withWorker("analytics.refresh", async () => Promise.resolve());
  });

  await boss.work(QUEUES.backupNightly, async () => {
    await runBackupNightly(db, log, storage);
  });

  await boss.work(QUEUES.integrityVerify, async () => {
    await runIntegrityVerify(db, log);
  });

  await boss.work(QUEUES.remindersSchedule, async () => {
    await runRemindersSchedule(db, log);
  });
}
