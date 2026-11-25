import type { CruxDb } from "@crux/db";
import type { Logger } from "../logger";

/** Stub K09 — pełna implementacja w K13. */
export async function runAnalyticsRefresh(
  db: CruxDb,
  log: Logger,
  input: { tenantId: string; locationId: string; day: string },
): Promise<void> {
  await db.withWorker("analytics.refresh", () => {
    log.info(
      {
        operation: "analytics.refresh",
        tenant_id: input.tenantId,
        location_id: input.locationId,
      },
      `analytics.refresh stub day=${input.day}`,
    );
    return Promise.resolve();
  });
}
