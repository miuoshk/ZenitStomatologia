import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor, CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import { LocalKeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import { createTenant } from "./tenants";
import { createLocation } from "./locations";

function keys() {
  return new LocalKeyProvider({
    KMS_LOCAL_DEK: randomBytes(32).toString("hex"),
    KMS_LOCAL_PEPPER: randomBytes(32).toString("hex"),
    KMS_KEY_ID: "local-v1",
  });
}

describe("@crux/org locations", () => {
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

  it("createLocation('1') odrzucone", async () => {
    const k = keys();
    const bootTenant = newId();
    const boot: Actor = {
      staffId: newId(),
      tenantId: bootTenant,
      locationIds: [],
      activeLocationId: newId(),
      role: "network_admin",
      permissions: ["org.manage"],
    };

    let tenantId = "";
    await app.withActor(boot, async (tx) => {
      const t = await createTenant(tx, { name: "Z", legalName: "Z" }, k);
      expect(t.ok).toBe(true);
      if (t.ok) tenantId = t.value.id;
    });

    const admin: Actor = { ...boot, tenantId, permissions: ["org.manage"] };
    const bad = await app.withActor(admin, async (tx) =>
      createLocation(tx, admin, {
        number: "1",
        name: "Zly",
        address: { city: "X" },
      }),
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.type).toBe("validation");
    }

    const good = await app.withActor(admin, async (tx) =>
      createLocation(tx, admin, {
        number: "01",
        name: "Nowodworska",
        address: { city: "Warszawa" },
      }),
    );
    expect(good.ok).toBe(true);
  });
});
