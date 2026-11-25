import { createLogger as createSharedLogger, type Logger } from "@crux/shared/logger";

export { ALLOWED_LOG_KEYS } from "@crux/shared/logger";
export type { Logger };

/** Nieosobowe klucze operacyjne workera (poza allowlistą `@crux/shared/logger`). */
export const WORKER_EXTRA_LOG_KEYS = [
  "operation",
  "topic",
  "status",
  "queue",
  "attempts",
  "flag",
  "metric",
] as const;

/** Wrapper na logger z `@crux/shared` (ADR-016): allowlista + `containsPii`. */
export function createLogger(name = "crux-worker"): Logger {
  return createSharedLogger({
    name,
    extraAllowedKeys: WORKER_EXTRA_LOG_KEYS,
    ...(process.env["NODE_ENV"] !== "production"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  });
}
