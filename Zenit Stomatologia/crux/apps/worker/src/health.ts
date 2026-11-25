import { createServer, type Server } from "node:http";
import type { Boss } from "./boss";
import { getLastDispatchAt } from "./dispatch/outbox";
import type { Logger } from "./logger";
import { systemClock, type Clock } from "@crux/shared/time";

const STALE_MS = 60_000;

export type HealthState = {
  bossStarted: boolean;
};

/**
 * GET /healthz → 200 gdy pg-boss działa i ostatni dispatch < 60 s.
 */
export function startHealthServer(
  port: number,
  state: HealthState,
  log: Logger,
  _boss: Boss,
  clock: Clock = systemClock,
): Server {
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      const last = getLastDispatchAt();
      const age = last === 0 ? Number.POSITIVE_INFINITY : clock.now().getTime() - last;
      const ok = state.bossStarted && age < STALE_MS;
      const body = JSON.stringify({
        ok,
        boss: state.bossStarted,
        lastDispatchAgeMs: last === 0 ? null : age,
      });
      res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    log.info({ operation: "healthz", status: "ok" }, `healthz on :${String(port)}`);
  });

  return server;
}
