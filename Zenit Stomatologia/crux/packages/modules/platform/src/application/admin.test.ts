import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests, withTestTenant } from "@crux/db/testing";
import { outbox } from "@crux/db/schema";
import { eq } from "drizzle-orm";
import { isEnabled } from "./feature-flags";
import { setFeatureFlag } from "./feature-flags-admin";
import { retryDeadOutbox } from "./outbox-admin";

describe("[K15] platform admin helpers", () => {
  let app: CruxDb;
  beforeAll(() => {
    app = createTestDb("app");
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetBetweenTests(app);
  });

  it("retryDeadOutbox: dead → pending; brak uprawnienia → forbidden", async () => {
    const fixture = await withTestTenant(app);
    const base = fixture.actorFor(fixture.staffA.network_admin);
    const actor = { ...base, permissions: [...base.permissions, "integrations.manage"] };
    const id = await app.withActor(actor, async (tx) => {
      const rows = await tx
        .insert(outbox)
        .values({ tenantId: actor.tenantId, topic: "platform.setting_changed.v1", payload: {}, status: "dead", attempts: 5 })
        .returning({ id: outbox.id });
      return rows[0]?.id ?? "";
    });

    const denied = { ...actor, permissions: [] };
    const no = await app.withActor(denied, (tx) => retryDeadOutbox(tx, denied, id));
    expect(no.ok).toBe(false);

    const yes = await app.withActor(actor, (tx) => retryDeadOutbox(tx, actor, id));
    expect(yes.ok).toBe(true);
    const row = await app.withActor(actor, async (tx) =>
      (await tx.select().from(outbox).where(eq(outbox.id, id)))[0],
    );
    expect(row?.status).toBe("pending");
    expect(row?.attempts).toBe(0);

    const again = await app.withActor(actor, (tx) => retryDeadOutbox(tx, actor, id));
    expect(again.ok).toBe(false);
  });

  it("setFeatureFlag: upsert na tenant i nadpisanie w gabinecie", async () => {
    const fixture = await withTestTenant(app);
    const base = fixture.actorFor(fixture.staffA.network_admin);
    const actor = { ...base, permissions: [...base.permissions, "settings.manage"] };
    const loc = fixture.location01;
    const result = await app.withActor(actor, async (tx) => {
      await setFeatureFlag(tx, actor, { key: "test.flag", enabled: true });
      await setFeatureFlag(tx, actor, { key: "test.flag", enabled: false });
      await setFeatureFlag(tx, actor, { key: "test.flag", enabled: true, locationId: loc });
      const tenant = await isEnabled(tx, "test.flag", { tenantId: actor.tenantId });
      const atLoc = await isEnabled(tx, "test.flag", { tenantId: actor.tenantId, locationId: loc });
      const bad = await setFeatureFlag(tx, actor, { key: "Bad Key", enabled: true });
      return { tenant, atLoc, bad };
    });
    expect(result.tenant.ok && result.tenant.value).toBe(false);
    expect(result.atLoc.ok && result.atLoc.value).toBe(true);
    expect(result.bad.ok).toBe(false);
  });
});
