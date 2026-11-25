import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { DbMappedError } from "./errors";
import { createDb, withActor, withWorker, type CruxDb } from "./index";
import {
  createTestDb,
  readClaimsRaw,
  readTenantId,
  resetBetweenTests,
  withTestTenant,
} from "./testing/index";

describe("@crux/db withActor / withWorker", () => {
  let app: CruxDb;
  let worker: CruxDb;

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
  });

  it("withActor ustawia claims (extensions.tenant_id) i czyści je po transakcji", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.receptionist);

    const inside = await withActor(app, actor, async (tx) => {
      const tenantId = await readTenantId(tx);
      const claims = await readClaimsRaw(tx);
      return { tenantId, claims };
    });

    expect(inside.tenantId).toBe(fixture.tenantA);
    expect(inside.claims).toContain(fixture.tenantA);

    const rows = await app.drizzle.execute(sql`select extensions.tenant_id() as tenant_id`);
    const row = rows[0] as { tenant_id: string | null };
    expect(row.tenant_id).toBeNull();
  });

  it("[K16] withActor z requestId ustawia crux.request_id, audit.events.request_id i czyści po transakcji", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.receptionist);
    const requestId = "req-k16-test";

    await withActor(
      app,
      actor,
      async (tx) => {
        const rows = await tx.execute(sql`select current_setting('crux.request_id', true) as rid`);
        expect((rows[0] as { rid: string }).rid).toBe(requestId);
        await tx.execute(
          sql`insert into tests.audit_probe (tenant_id, label) values (${fixture.tenantA}, 'k16')`,
        );
      },
      { requestId },
    );

    const after = await app.drizzle.execute(
      sql`select nullif(current_setting('crux.request_id', true), '') as rid`,
    );
    expect((after[0] as { rid: string | null }).rid).toBeNull();

    const auditor = fixture.actorFor(fixture.staffA.auditor);
    const events = await withActor(app, auditor, async (tx) =>
      tx.execute(
        sql`select request_id from audit.events where table_name = 'tests.audit_probe' and action = 'insert'`,
      ),
    );
    expect(events.map((r) => (r as { request_id: string | null }).request_id)).toContain(requestId);
  });

  it("[K16] withActor ignoruje requestId w niebezpiecznym formacie (np. PII)", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.receptionist);
    const rid = await withActor(
      app,
      actor,
      async (tx) => {
        const rows = await tx.execute(
          sql`select nullif(current_setting('crux.request_id', true), '') as rid`,
        );
        return (rows[0] as { rid: string | null }).rid;
      },
      { requestId: "jan kowalski@example.com" },
    );
    expect(rid).toBeNull();
  });

  it("withWorker z nieznaną operacją rzuca forbidden", async () => {
    try {
      await withWorker(worker, "not.a.real.operation", () => Promise.resolve("nope"));
      expect.fail("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DbMappedError);
      if (error instanceof DbMappedError) {
        expect(error.mapped.type).toBe("forbidden");
      }
    }
  });

  it("withWorker z dozwoloną operacją ustawia claims workera", async () => {
    const claims = await withWorker(worker, "outbox.dispatch", async (tx) => {
      return readClaimsRaw(tx);
    });
    expect(claims).toBeTruthy();
    if (!claims) throw new Error("expected claims");
    const parsed: unknown = JSON.parse(claims);
    expect(parsed).toMatchObject({ worker: true, operation: "outbox.dispatch" });
  });

  it("withActor na kliencie worker rzuca", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.dentist);
    try {
      await withActor(worker, actor, () => Promise.resolve(1));
      expect.fail("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DbMappedError);
    }
  });

  it("createDb app/worker — pule i role", async () => {
    const a = createDb(
      process.env["DATABASE_URL"] ??
        "postgresql://crux_app:crux_app_local_only@127.0.0.1:54322/postgres",
      { role: "app" },
    );
    const w = createDb(
      process.env["DATABASE_URL_WORKER"] ??
        "postgresql://crux_worker:crux_worker_local_only@127.0.0.1:54322/postgres",
      { role: "worker" },
    );
    expect(a.role).toBe("app");
    expect(w.role).toBe("worker");
    await a.close();
    await w.close();
  });
});
