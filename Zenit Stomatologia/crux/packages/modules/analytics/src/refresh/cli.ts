import { createDb } from "@crux/db";
import { systemClock } from "@crux/shared/time";
import { refreshAnalytics } from "./refresh";
import { fullWindow } from "./windows";

/**
 * Ręczne odświeżenie analytics (po `pnpm seed:demo`):
 *   pnpm analytics:refresh -- --from 2025-10-01 --to 2026-10-31 [--mode full|incremental]
 * Bez --from/--to: pełne okno 13 miesięcy od dziś. Połączenie jako crux_worker
 * (`DATABASE_URL_WORKER`, domyślnie lokalny Supabase).
 */
const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const url =
  process.env["DATABASE_URL_WORKER"] ??
  "postgresql://crux_worker:crux_worker_local_only@127.0.0.1:54322/postgres";
const window = fullWindow(systemClock);
const from = arg("from") ?? window.from;
const to = arg("to") ?? window.to;
const mode = arg("mode") === "incremental" ? "incremental" : "full";

const db = createDb(url, { role: "worker" });
try {
  const r = await db.withWorker("analytics.refresh", (tx) =>
    refreshAnalytics(tx, { mode, from, to }),
  );
  console.log(
    `analytics:refresh ${mode} ${from}…${to} — wiersze: ${String(r.rowsWritten)} ` +
      `(pojemność ${String(r.capacityRows)}, obłożenie ${String(r.occupancyRows)}, zamknięcia ${String(r.closureRows)})`,
  );
} finally {
  await db.close();
}
