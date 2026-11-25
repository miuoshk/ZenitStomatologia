import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import {
  bootstrapTenant,
  createFakeAuthAdmin,
  createFakeKeyProvider,
  createRng,
  isTestNpwz,
  persistStaff,
  staffFactory,
} from "@crux/testing";
import { inviteStaffMember, listStaff } from "./staff";

describe("@crux/identity × @crux/testing (fabryki)", () => {
  let db: CruxDb;

  beforeAll(() => {
    db = createTestDb("app");
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await resetBetweenTests(db);
  });

  it("[K12] staffFactory + fakeAuthAdmin: syntetyczny dentysta z NPWZ testowym i deterministycznym authUserId", async () => {
    const { admin } = await bootstrapTenant(db, createFakeKeyProvider());
    const params = staffFactory(createRng(3), "dent1", "dentist");
    expect(isTestNpwz(params.npwz ?? "")).toBe(true);
    const authAdmin = createFakeAuthAdmin();

    await db.withActor(admin, async (tx) => {
      const created = await persistStaff(tx, admin, params);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const invited = await inviteStaffMember(
        tx,
        admin,
        { staffId: created.value.id, email: params.email, temporaryPassword: "x" },
        authAdmin,
      );
      expect(invited.ok).toBe(true);
      const list = await listStaff(tx, admin);
      expect(list.ok && list.value.map((s) => s.email)).toEqual(["dent1@demo.invalid"]);
    });
    expect(authAdmin.created).toHaveLength(1);
  });
});
