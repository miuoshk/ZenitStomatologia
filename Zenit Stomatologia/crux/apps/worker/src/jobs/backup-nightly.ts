import { spawn } from "node:child_process";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CruxDb } from "@crux/db";
import { auditEvents } from "@crux/db/schema";
import type { FileStoragePort } from "@crux/integrations";
import { LocalKeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import { systemClock, toLocalDay } from "@crux/shared/time";
import type { Logger } from "../logger";

const SCHEMAS = ["public", "audit", "platform", "ref", "analytics"] as const;

/** Id systemowe workera (backup / zdarzenia bez tenanta UI). */
const SYSTEM_ID = "00000000-0000-4000-8000-000000000001";

/**
 * pg_dump wybranych schematów → AES-256-GCM (KeyProvider) → FileStoragePort.
 * Bez schematu `pgboss`.
 */
export async function runBackupNightly(
  db: CruxDb,
  log: Logger,
  storage: FileStoragePort,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ uri: string; bytes: number }> {
  return db.withWorker("backup.nightly", async (tx) => {
    const dumpUrl = env["DATABASE_URL_WORKER"] ?? env["DATABASE_URL"];
    if (!dumpUrl) throw new Error("DATABASE_URL_WORKER missing for backup");

    const dir = await mkdtemp(path.join(tmpdir(), "crux-backup-"));
    const dumpPath = path.join(dir, "crux.dump");
    try {
      await pgDump(dumpUrl, dumpPath, [...SCHEMAS]);
      const plain = await readFile(dumpPath);
      const keys = new LocalKeyProvider(env);
      const keyId = await keys.currentKeyId("system");
      const dek = await keys.getDek("system", keyId);
      const encrypted = sealAesGcm(plain, dek);

      const day = toLocalDay(systemClock.now());
      const key = `backups/${day}/crux-${day}.dump.aesgcm`;
      const { uri } = await storage.putObject({
        key,
        body: encrypted,
        contentType: "application/octet-stream",
      });

      await tx.insert(auditEvents).values({
        id: newId(),
        tenantId: SYSTEM_ID,
        actorId: SYSTEM_ID,
        actorRole: "worker",
        tableName: "backup",
        rowId: newId(),
        action: "backup.completed",
        before: null,
        after: { uri, bytes: encrypted.length, keyId },
        reason: "backup.nightly",
      });

      log.info({ operation: "backup.nightly", status: "ok" }, "backup completed");
      return { uri, bytes: encrypted.length };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

function sealAesGcm(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("CRUXB1"), iv, tag, enc]);
}

function pgDump(url: string, outFile: string, schemas: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["-Fc", "-f", outFile, ...schemas.flatMap((s) => ["-n", s]), url];
    const child = spawn("pg_dump", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (c: Buffer) => {
      err += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exit ${String(code)}: ${err.slice(0, 400)}`));
    });
  });
}
