import { dayWindow, fullWindow, incrementalWindow, refreshAnalytics } from "@crux/analytics";
import type { CruxDb } from "@crux/db";
import { systemClock, type Clock } from "@crux/shared/time";
import type { Logger } from "../logger";

export type AnalyticsRefreshInput = {
  /** Zdarzenie `occupancy.*`: gabinet + dzień. Bez `day` → ostatnie 48 h. */
  tenantId?: string;
  locationId?: string;
  day?: string;
};

/**
 * `analytics.refresh` przyrostowo: dzień z payloadu zdarzenia (gabinet) albo ostatnie 48 h
 * (cron co 5 min, wszystkie tenanty i gabinety). Idempotentne.
 */
export async function runAnalyticsRefresh(
  db: CruxDb,
  log: Logger,
  input: AnalyticsRefreshInput,
  clock: Clock = systemClock,
): Promise<void> {
  const window = input.day ? dayWindow(input.day) : incrementalWindow(clock);
  const result = await db.withWorker("analytics.refresh", (tx) =>
    refreshAnalytics(tx, {
      mode: "incremental",
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...window,
    }),
  );
  log.info(
    {
      operation: "analytics.refresh",
      ...(input.tenantId ? { tenant_id: input.tenantId } : {}),
      ...(input.locationId ? { location_id: input.locationId } : {}),
    },
    `analytics.refresh incremental ${window.from}…${window.to} rows=${String(result.rowsWritten)}`,
  );
}

/** Pełne odświeżenie 02:10: 13 miesięcy, wszystkie tenanty i gabinety. */
export async function runAnalyticsRefreshFull(
  db: CruxDb,
  log: Logger,
  clock: Clock = systemClock,
): Promise<void> {
  const window = fullWindow(clock);
  const result = await db.withWorker("analytics.refresh", (tx) =>
    refreshAnalytics(tx, { mode: "full", ...window }),
  );
  log.info(
    { operation: "analytics.refresh" },
    `analytics.refresh full ${window.from}…${window.to} rows=${String(result.rowsWritten)}`,
  );
}
