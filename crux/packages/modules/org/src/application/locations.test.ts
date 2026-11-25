import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor, CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import { LocalKeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import { createTenant } from "./tenants";
import { createLocation, getOpeningHours, replaceWeeklyHours, upsertOpeningException } from "./locations";

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

describe("[K15] org admin helpers", () => {
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

  it("replaceWeeklyHours + upsertOpeningException", async () => {
    const k = keys();
    const boot: Actor = {
      staffId: newId(),
      tenantId: newId(),
      locationIds: [],
      activeLocationId: newId(),
      role: "network_admin",
      permissions: ["org.manage"],
    };
    let tenantId = "";
    await app.withActor(boot, async (tx) => {
      const t = await createTenant(tx, { name: "Z", legalName: "Z" }, k);
      if (t.ok) tenantId = t.value.id;
    });
    const admin: Actor = { ...boot, tenantId };
    const out = await app.withActor(admin, async (tx) => {
      const loc = await createLocation(tx, admin, { number: "01", name: "Test", address: { city: "X" } });
      if (!loc.ok) throw new Error("loc");
      const locationId = loc.value.id;
      const week = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens: "08:00", closes: "16:00" }));
      const hours = [...week, null, null];
      const first = await replaceWeeklyHours(tx, admin, { locationId, validFrom: "2030-01-01", hours });
      const same = await replaceWeeklyHours(tx, admin, { locationId, validFrom: "2030-01-01", hours });
      const changed = await replaceWeeklyHours(tx, admin, {
        locationId,
        validFrom: "2030-02-01",
        hours: [{ weekday: 1, opens: "09:00", closes: "17:00" }, ...hours.slice(1)],
      });
      const bad = await replaceWeeklyHours(tx, admin, {
        locationId,
        validFrom: "2030-02-01",
        hours: [{ weekday: 1, opens: "17:00", closes: "09:00" }, ...hours.slice(1)],
      });
      const jan = await getOpeningHours(tx, admin, locationId, "2030-01-14"); // poniedziałek
      const feb = await getOpeningHours(tx, admin, locationId, "2030-02-04"); // poniedziałek
      const e1 = await upsertOpeningException(tx, admin, { locationId, day: "2030-02-04", closed: true, reason: "x" });
      const e2 = await upsertOpeningException(tx, admin, { locationId, day: "2030-02-04", closed: false, opens: "10:00", closes: "12:00" });
      const exc = await getOpeningHours(tx, admin, locationId, "2030-02-04");
      return { first, same, changed, bad, jan, feb, e1, e2, exc };
    });
    expect(out.first.ok && out.first.value.changed).toBe(5);
    expect(out.same.ok && out.same.value.changed).toBe(0);
    expect(out.changed.ok && out.changed.value.changed).toBe(1);
    expect(out.bad.ok).toBe(false);
    expect(out.jan.ok && out.jan.value.opens?.slice(0, 5)).toBe("08:00");
    expect(out.feb.ok && out.feb.value.opens?.slice(0, 5)).toBe("09:00");
    expect(out.e1.ok && out.e2.ok && out.e1.value.id === out.e2.value.id).toBe(true);
    expect(out.exc.ok && out.exc.value.opens?.slice(0, 5)).toBe("10:00");
  });
});
