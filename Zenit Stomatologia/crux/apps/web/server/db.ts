import { createDb, type CruxDb } from "@crux/db";
import { databaseUrl } from "./env";

let cached: CruxDb | null = null;

export function getDb(): CruxDb {
  if (!cached) {
    cached = createDb(databaseUrl(), { role: "app" });
  }
  return cached;
}
