import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import {
  bootstrapTenant,
  chairFactory,
  createFakeKeyProvider,
  locationFactory,
  persistChair,
  persistLocation,
} from "@crux/testing";
import { listChairs, listLocations } from "./locations";

describe("@crux/org × @crux/testing (fabryki)", () => {
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

  it("[K12] gabinety 01/02 z color_key '01'/'02' i fotele z fabryk", async () => {
    const { admin } = await bootstrapTenant(db, createFakeKeyProvider());
    await db.withActor(admin, async (tx) => {
      const l1 = await persistLocation(tx, admin, locationFactory("01"));
      const l2 = await persistLocation(tx, admin, locationFactory("02"));
      expect(l1.ok && l2.ok).toBe(true);
      if (!l1.ok || !l2.ok) return;
      expect((await persistChair(tx, admin, l1.value.id, chairFactory(1))).ok).toBe(true);

      const list = await listLocations(tx, admin);
      expect(list.ok && list.value.map((l) => l.number).sort()).toEqual(["01", "02"]);
      const chairs = await listChairs(tx, admin, l1.value.id);
      expect(chairs.ok && chairs.value).toHaveLength(1);
    });
  });
});
