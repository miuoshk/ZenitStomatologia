import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor, CruxDb } from "@crux/db";
import {
  auditEvents,
  locations,
  memberships,
  staffMembers,
  tenants,
} from "@crux/db/schema";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import { newId } from "@crux/shared/id";
import { FixedClock, instantFromIso } from "@crux/shared/time";
import { eq } from "drizzle-orm";
import { authorize } from "./authorize.js";
import { buildClaims } from "./build-claims.js";

describe("@crux/identity authorize / buildClaims", () => {
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

  it("authorize odrzuca brak uprawnienia i zapisuje audyt", async () => {
    const tenantId = newId();
    const actor: Actor = {
      staffId: newId(),
      tenantId,
      locationIds: [],
      activeLocationId: newId(),
      role: "receptionist",
      permissions: ["occupancy.read"],
    };

    const boot: Actor = {
      staffId: newId(),
      tenantId,
      locationIds: [],
      activeLocationId: newId(),
      role: "network_admin",
      permissions: ["org.manage"],
    };

    await app.withActor(boot, async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: "T",
        legalName: "T Sp. z o.o.",
        dekKeyId: "local-v1",
      });
    });

    const result = await app.withActor(actor, async (tx) => authorize(tx, actor, "org.manage"));
    expect(result.ok).toBe(false);

    const events = await app.withActor(
      { ...actor, permissions: ["audit.read"] },
      async (tx) =>
        tx
          .select({ action: auditEvents.action })
          .from(auditEvents)
          .where(eq(auditEvents.tenantId, tenantId)),
    );
    expect(events.some((e) => e.action === "forbidden")).toBe(true);
  });

  it("buildClaims nie uwzględnia członkostwa zakończonego", async () => {
    const clock = new FixedClock(instantFromIso("2027-06-15T12:00:00.000Z"));
    const authUserId = newId();
    const tenantId = newId();
    const locationId = newId();
    const staffId = newId();

    const boot: Actor = {
      staffId: newId(),
      tenantId,
      locationIds: [locationId],
      activeLocationId: locationId,
      role: "network_admin",
      permissions: ["org.manage", "staff.manage"],
    };

    await app.withActor(boot, async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: "A",
        legalName: "A",
        dekKeyId: "local-v1",
      });
      await tx.insert(locations).values({
        id: locationId,
        tenantId,
        number: "01",
        name: "Nowodworska",
        address: { city: "Warszawa" },
        colorKey: "loc1",
      });
      await tx.insert(staffMembers).values({
        id: staffId,
        tenantId,
        authUserId,
        firstName: "Anna",
        lastName: "Nowak",
        email: "anna@example.com",
      });
      await tx.insert(memberships).values({
        tenantId,
        staffId,
        locationId,
        role: "receptionist",
        startsOn: "2027-01-01",
      });
      await tx.insert(memberships).values({
        tenantId,
        staffId,
        locationId,
        role: "dentist",
        startsOn: "2026-01-01",
        endsOn: "2027-01-01",
      });
    });

    const claims = await app.withActor(boot, async (tx) =>
      buildClaims(tx, authUserId, locationId, clock),
    );
    expect(claims.ok).toBe(true);
    if (!claims.ok) return;
    expect(claims.value.role).toBe("receptionist");
    expect(claims.value.permissions).toContain("occupancy.read");
    expect(claims.value.permissions).not.toContain("occupancy.write_own");
  });
});
