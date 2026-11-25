import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CruxDb } from "@crux/db";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import {
  bootstrapTenant,
  createFakeKeyProvider,
  locationFactory,
  persistLocation,
} from "@crux/testing";
import { getSetting, setSetting } from "./settings";

describe("@crux/platform × @crux/testing (fabryki)", () => {
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

  it("[K12] ustawienie gabinetu zapisane dla lokalizacji z fabryki", async () => {
    const { admin } = await bootstrapTenant(db, createFakeKeyProvider());
    await db.withActor(admin, async (tx) => {
      const loc = await persistLocation(tx, admin, locationFactory("01"));
      if (!loc.ok) throw new Error("location");
      const set = await setSetting(tx, admin, "scheduling.occupancy_mode", "appointments", loc.value.id);
      expect(set.ok).toBe(true);
      const got = await getSetting(tx, admin, "scheduling.occupancy_mode", loc.value.id);
      expect(got.ok && got.value).toBe("appointments");
    });
  });
});
