import { createDb, sql, type Actor } from "@crux/db";
import { ADMIN_PERMISSIONS } from "../factories/bootstrap";
import { GOLDEN_OPERATOR_ID } from "./constants";
import { readExpected, readVerifySql } from "./files";
import { compareGolden } from "./compare";

/** `pnpm --filter @crux/testing verify:golden` — verify.sql vs golden/expected.json. */
const url = process.env["DATABASE_URL"];
if (!url) throw new Error("verify:golden: ustaw DATABASE_URL (baza z załadowanym golden)");

const expected = await readExpected();
const locationIds = Object.values(expected.meta.locations);
const actor: Actor = {
  staffId: GOLDEN_OPERATOR_ID,
  tenantId: expected.meta.tenant_id,
  locationIds,
  activeLocationId: locationIds[0] ?? GOLDEN_OPERATOR_ID,
  role: "network_admin",
  permissions: ADMIN_PERMISSIONS,
};

const db = createDb(url, { role: "app" });
try {
  const query = await readVerifySql(expected.meta.tenant_id);
  const rows = await db.withActor(actor, (tx) => tx.execute(sql.raw(query)));
  const raw: unknown = (rows[0] as { result?: unknown } | undefined)?.result;
  const actual = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
  const diffs = compareGolden(expected, actual);
  if (diffs.length > 0) {
    console.error("verify:golden — NIEZGODNOŚĆ:\n" + diffs.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("verify:golden OK — verify.sql zgodne z expected.json");
  }
} finally {
  await db.close();
}
