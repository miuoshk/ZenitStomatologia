import { createDb, type CruxDb } from "@crux/db";
import { databaseUrl } from "./env";
import { getRequestId } from "./request-context";

let cached: CruxDb | null = null;

/**
 * Klient DB dla web. `withActor` automatycznie dokłada `requestId` z nagłówka
 * `x-request-id` (K16) → `crux.request_id` → `audit.events.request_id`.
 */
export function getDb(): CruxDb {
  if (!cached) {
    const base = createDb(databaseUrl(), { role: "app" });
    cached = {
      ...base,
      withActor: async (actor, fn, opts) => {
        const requestId = opts?.requestId ?? (await getRequestId());
        return base.withActor(actor, fn, requestId === undefined ? undefined : { requestId });
      },
    };
  }
  return cached;
}
