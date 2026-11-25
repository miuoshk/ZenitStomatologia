import pino, { type LoggerOptions } from "pino";

/** Dozwolone pola w logach — nigdy hasła / PESEL / treść wiadomości. */
export const ALLOWED_LOG_KEYS = [
  "level",
  "time",
  "msg",
  "pid",
  "hostname",
  "request_id",
  "operation",
  "topic",
  "outbox_id",
  "tenant_id",
  "location_id",
  "attempts",
  "status",
  "queue",
  "job_id",
  "err",
] as const;

export function createLogger(name = "crux-worker") {
  const opts: LoggerOptions = {
    name,
    level: process.env["LOG_LEVEL"] ?? "info",
    redact: {
      paths: ["password", "pesel", "email", "phone", "content", "authorization"],
      remove: true,
    },
  };
  if (process.env["NODE_ENV"] !== "production") {
    opts.transport = { target: "pino-pretty", options: { colorize: true } };
  }
  return pino(opts);
}

export type Logger = ReturnType<typeof createLogger>;
