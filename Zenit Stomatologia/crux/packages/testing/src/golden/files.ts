import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GOLDEN_TENANT_ID } from "./constants";
import type { GoldenExpected } from "./metrics";

const here = path.dirname(fileURLToPath(import.meta.url));
export const GOLDEN_DIR = path.resolve(here, "../../golden");
export const EXPECTED_PATH = path.join(GOLDEN_DIR, "expected.json");
export const VERIFY_SQL_PATH = path.join(GOLDEN_DIR, "verify.sql");

export async function readExpected(): Promise<GoldenExpected> {
  return JSON.parse(await readFile(EXPECTED_PATH, "utf8")) as GoldenExpected;
}

/** verify.sql z podstawionym tenant id (domyślnie golden). */
export async function readVerifySql(tenantId: string = GOLDEN_TENANT_ID): Promise<string> {
  return (await readFile(VERIFY_SQL_PATH, "utf8")).replaceAll(GOLDEN_TENANT_ID, tenantId);
}
