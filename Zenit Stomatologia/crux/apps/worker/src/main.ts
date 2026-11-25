import { createDb } from "@crux/db";
import { createLocalFolderStorage } from "@crux/integrations";
import { mkdir } from "node:fs/promises";
import { startBoss, stopBoss } from "./boss";
import { markDispatchNow } from "./dispatch/outbox";
import { startHealthServer, type HealthState } from "./health";
import { registerJobs } from "./jobs/register";
import { createLogger } from "./logger";

const log = createLogger();

async function main(): Promise<void> {
  const workerUrl = process.env["DATABASE_URL_WORKER"];
  if (!workerUrl) {
    throw new Error("DATABASE_URL_WORKER is required");
  }

  const backupDir = process.env["BACKUP_LOCAL_DIR"] ?? "./.data/backups";
  await mkdir(backupDir, { recursive: true });
  const storage = createLocalFolderStorage(backupDir);

  const db = createDb(workerUrl, { role: "worker" });
  const boss = await startBoss(workerUrl, log);
  markDispatchNow();

  const healthState: HealthState = { bossStarted: true };
  const healthPort = Number(process.env["WORKER_HEALTH_PORT"] ?? "8081");
  const health = startHealthServer(healthPort, healthState, log, boss);

  await registerJobs({ boss, db, log, storage });
  log.info({ operation: "worker", status: "ready" }, "crux-worker ready");

  const shutdown = async (signal: string) => {
    log.info({ operation: "worker", status: signal }, "shutting down");
    healthState.bossStarted = false;
    await new Promise<void>((resolve, reject) => {
      health.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await stopBoss(boss);
    await db.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown";
  log.error({ err: message, operation: "worker" }, "fatal");
  process.exit(1);
});
