import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests, withTestTenant } from "@crux/db/testing";
import { LocalKeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import { outbox } from "@crux/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { publishEvent } from "./publish-event";
import { logAccess } from "./log-access";
import { setSetting, getSetting } from "./settings";

function keyEnv(): NodeJS.ProcessEnv {
  return {
    KMS_LOCAL_DEK: randomBytes(32).toString("hex"),
    KMS_LOCAL_PEPPER: randomBytes(32).toString("hex"),
    KMS_KEY_ID: "local-v1",
  };
}

describe("@crux/platform integration", () => {
  let app: CruxDb;
  const keys = new LocalKeyProvider(keyEnv());

  beforeAll(() => {
    app = createTestDb("app");
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetBetweenTests(app);
  });

  it("publishEvent z nieznanym tematem rzuca validation", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.receptionist);
    const result = await app.withActor(actor, async (tx) =>
      publishEvent(tx, actor, "unknown.topic.v1", { entityId: newId() }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("validation");
  });

  it("dedupeKey powtórzony nie tworzy drugiego wiersza", async () => {
    const fixture = await withTestTenant(app);
    const actor = fixture.actorFor(fixture.staffA.receptionist);
    const entityId = newId();

    const ids = await app.withActor(actor, async (tx) => {
      const a = await publishEvent(
        tx,
        actor,
        "platform.test.v1",
        { entityId },
        { dedupeKey: "test:once" },
      );
      const b = await publishEvent(
        tx,
        actor,
        "platform.test.v1",
        { entityId },
        { dedupeKey: "test:once" },
      );
      const rows = await tx
        .select({ id: outbox.id })
        .from(outbox)
        .where(and(eq(outbox.tenantId, actor.tenantId), eq(outbox.dedupeKey, "test:once")));
      return { a, b, count: rows.length };
    });

    expect(ids.a.ok && ids.a.value.deduped).toBe(false);
    expect(ids.b.ok && ids.b.value.deduped).toBe(true);
    expect(ids.count).toBe(1);
  });

  it("logAccess zapisuje ip_hash (HMAC), nie surowy IP", async () => {
    const fixture = await withTestTenant(app);
    // auditor ma audit.read — odczyt access_log pod RLS
    const actor = fixture.actorFor(fixture.staffA.auditor);
    const patientId = newId();

    const row = await app.withActor(actor, async (tx) => {
      const logged = await logAccess(
        tx,
        actor,
        {
          patientId,
          resource: "patient_record",
          action: "view",
          ip: "203.0.113.10",
        },
        keys,
      );
      expect(logged.ok).toBe(true);
      const rows = await tx.execute(sql`
        select ip_hash is not null as has_hash,
               encode(ip_hash, 'hex') as ip_hex
        from audit.access_log
        where patient_id = ${patientId}::uuid
        limit 1
      `);
      return rows[0] as { has_hash: boolean; ip_hex: string } | undefined;
    });

    expect(row).toBeDefined();
    expect(row?.has_hash).toBe(true);
    expect(row?.ip_hex).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.ip_hex).not.toContain("203");
  });

  it("setSetting odrzuca wartość spoza schematu klucza", async () => {
    const fixture = await withTestTenant(app);
    const actor = {
      ...fixture.actorFor(fixture.staffA.location_manager),
      permissions: ["settings.manage", "network.view", "occupancy.read"],
    };

    const bad = await app.withActor(actor, async (tx) =>
      setSetting(tx, actor, "scheduling.occupancy_mode", "nope"),
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.type).toBe("validation");

    const good = await app.withActor(actor, async (tx) => {
      const set = await setSetting(tx, actor, "scheduling.occupancy_mode", "appointments");
      const got = await getSetting(tx, actor, "scheduling.occupancy_mode");
      return { set, got };
    });
    expect(good.set.ok).toBe(true);
    expect(good.got.ok && good.got.value).toBe("appointments");
  });
});
