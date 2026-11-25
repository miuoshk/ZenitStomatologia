import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, sql, type CruxDb } from "@crux/db";
import { outbox } from "@crux/db/schema";
import { createTestDb, resetBetweenTests, withTestTenant } from "@crux/db/testing";
import { newId } from "@crux/shared/id";
import { createLogger } from "../logger";
import { dispatchOutboxBatch } from "./outbox";

describe("dispatchOutboxBatch [db]", () => {
  let app: CruxDb;
  let worker: CruxDb;
  const log = createLogger("test-worker");

  beforeAll(() => {
    app = createTestDb("app");
    worker = createTestDb("worker");
  });

  afterAll(async () => {
    await app.close();
    await worker.close();
  });

  beforeEach(async () => {
    await resetBetweenTests(app);
    await worker.withWorker("outbox.dispatch", async (tx) => {
      await tx.delete(outbox);
    });
  });

  it("sukces → status=sent dla platform.test.v1", async () => {
    const fixture = await withTestTenant(app);
    const id = newId();
    const entityId = newId();

    await worker.withWorker("outbox.dispatch", async (tx) => {
      await tx.insert(outbox).values({
        id,
        tenantId: fixture.tenantA,
        topic: "platform.test.v1",
        payload: { entityId },
        status: "pending",
      });
    });

    const result = await dispatchOutboxBatch(
      worker,
      {
        log,
        enqueueAnalyticsRefresh: () => Promise.resolve(),
      },
      { limit: 10 },
    );

    expect(result.sent).toBe(1);
    const rows = await worker.withWorker("outbox.dispatch", async (tx) => {
      const r = await tx.execute(sql`
        select status from platform.outbox where id = ${id}::uuid
      `);
      return [...r] as { status: string }[];
    });
    expect(rows[0]?.status).toBe("sent");
  });

  it("po 8 błędach → dead + platform.outbox.dead.v1", async () => {
    const fixture = await withTestTenant(app);
    const id = newId();

    await worker.withWorker("outbox.dispatch", async (tx) => {
      await tx.insert(outbox).values({
        id,
        tenantId: fixture.tenantA,
        topic: "platform.test.v1",
        payload: { bad: true },
        status: "pending",
        attempts: 7,
      });
    });

    const result = await dispatchOutboxBatch(
      worker,
      {
        log,
        enqueueAnalyticsRefresh: () => Promise.resolve(),
      },
      { limit: 10 },
    );

    expect(result.dead).toBe(1);
    const rows = await worker.withWorker("outbox.dispatch", async (tx) => {
      const r = await tx.execute(sql`
        select status from platform.outbox where id = ${id}::uuid
      `);
      return [...r] as { status: string }[];
    });
    expect(rows[0]?.status).toBe("dead");

    const deadEvents = await worker.withWorker("outbox.dispatch", async (tx) => {
      const r = await tx.execute(sql`
        select id from platform.outbox where topic = 'platform.outbox.dead.v1'
      `);
      return [...r];
    });
    expect(deadEvents.length).toBeGreaterThanOrEqual(1);
  });
});

describe("withWorker nieznana operacja", () => {
  it("rzuca forbidden", async () => {
    const url =
      process.env["DATABASE_URL_WORKER"] ??
      "postgresql://crux_worker:crux_worker_local_only@127.0.0.1:54322/postgres";
    const db = createDb(url, { role: "worker" });
    try {
      await expect(
        db.withWorker("nieznana", () => Promise.resolve("x")),
      ).rejects.toMatchObject({ mapped: { type: "forbidden" } });
    } finally {
      await db.close();
    }
  });
});
