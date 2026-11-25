import pino, { type DestinationStream, type Logger as PinoLogger, type LoggerOptions } from "pino";
import { containsPii } from "./pii";

/** Zastępnik wartości wykrytej jako dane osobowe. */
export const REDACTED = "[REDACTED]";
/** Kod wiadomości emitowany (warn) po każdej redakcji / usunięciu pól. */
export const LOGGER_REDACTED_CODE = "logger.redacted";

/** Klucze dozwolone w logach (poza kończącymi się na `Id`). Nigdy dane osobowe. */
export const ALLOWED_LOG_KEYS: ReadonlySet<string> = new Set([
  "requestId",
  "actorId",
  "tenantId",
  "locationId",
  "module",
  "usecase",
  "durationMs",
  "errorType",
  "redactedCount",
  "level",
  "time",
  "msg",
  "pid",
  "hostname",
  "name",
]);

const MAX_DEPTH = 5;
const ID_SUFFIX_RE = /[a-z0-9]Id$/;

export type CreateLoggerOptions = {
  readonly name?: string;
  readonly level?: string;
  /** Dodatkowe, nieosobowe klucze operacyjne (np. `operation`, `status`). */
  readonly extraAllowedKeys?: readonly string[];
  /** Strumień docelowy (testy); domyślnie stdout. */
  readonly destination?: DestinationStream;
  /** Transport pino (np. pino-pretty w dev); ignorowany, gdy podano `destination`. */
  readonly transport?: LoggerOptions["transport"];
};

export type Logger = PinoLogger;

type Counter = { count: number };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(value: string, counter: Counter): string {
  if (containsPii(value)) {
    counter.count += 1;
    return REDACTED;
  }
  return value;
}

/** `err`: tylko `type` i `message` (bez stosu — stos może zawierać treść). */
function sanitizeError(value: unknown, counter: Counter): unknown {
  if (typeof value === "string") return sanitizeString(value, counter);
  if (value instanceof Error) {
    return {
      type: value.name,
      message: sanitizeString(value.message, counter),
    };
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of ["type", "message"] as const) {
      const v = value[key];
      if (typeof v === "string") out[key] = sanitizeString(v, counter);
    }
    return out;
  }
  counter.count += 1;
  return REDACTED;
}

function sanitizeValue(
  value: unknown,
  allowed: ReadonlySet<string>,
  counter: Counter,
  depth: number,
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeString(value, counter);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return sanitizeError(value, counter);
  if (depth >= MAX_DEPTH) {
    counter.count += 1;
    return REDACTED;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => sanitizeValue(item, allowed, counter, depth + 1));
  }
  if (isPlainObject(value)) return sanitizeObject(value, allowed, counter, depth + 1);
  counter.count += 1;
  return undefined;
}

function sanitizeObject(
  input: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  counter: Counter,
  depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "err") {
      out[key] = sanitizeError(value, counter);
      continue;
    }
    if (!allowed.has(key) && !ID_SUFFIX_RE.test(key)) {
      counter.count += 1;
      continue;
    }
    out[key] = sanitizeValue(value, allowed, counter, depth);
  }
  return out;
}

/**
 * Czyści obiekt logu: zostają tylko klucze z allowlisty (+ `*Id`), rekurencyjnie;
 * wartości tekstowe z PII → `[REDACTED]`. Zwraca też liczbę usuniętych/zredagowanych pól.
 */
export function sanitizeLogObject(
  input: Record<string, unknown>,
  extraAllowedKeys: readonly string[] = [],
): { readonly value: Record<string, unknown>; readonly redactedCount: number } {
  const allowed = new Set<string>([...ALLOWED_LOG_KEYS, ...extraAllowedKeys]);
  const counter: Counter = { count: 0 };
  const value = sanitizeObject(input, allowed, counter, 0);
  return { value, redactedCount: counter.count };
}

/**
 * Fabryka loggera pino (ADR-016): allowlista kluczy, scrub rekurencyjny, `containsPii`
 * na wartościach tekstowych. Brak redakcji = brak narzutu poza przejściem po obiekcie.
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const extra = options.extraAllowedKeys ?? [];
  const allowed = new Set<string>([...ALLOWED_LOG_KEYS, ...extra]);

  const opts: LoggerOptions = {
    level: options.level ?? process.env["LOG_LEVEL"] ?? "info",
    serializers: { err: (e: unknown) => e },
    hooks: {
      logMethod(args, method) {
        const counter: Counter = { count: 0 };
        const emit = method as (this: Logger, ...a: unknown[]) => void;
        const first: unknown = args[0];
        const second: unknown = args[1];
        if (typeof first === "string") {
          emit.call(this, sanitizeString(first, counter));
        } else if (first instanceof Error) {
          const msg = typeof second === "string" ? second : first.message;
          emit.call(this, { err: sanitizeError(first, counter) }, sanitizeString(msg, counter));
        } else if (isPlainObject(first)) {
          const obj = sanitizeObject(first, allowed, counter, 0);
          if (typeof second === "string") {
            emit.call(this, obj, sanitizeString(second, counter));
          } else {
            emit.call(this, obj);
          }
        } else {
          counter.count += 1;
          emit.call(this, {});
        }
        if (counter.count > 0) {
          this.warn({ redactedCount: counter.count }, LOGGER_REDACTED_CODE);
        }
      },
    },
  };
  if (options.name !== undefined) opts.name = options.name;
  if (options.destination === undefined && options.transport !== undefined) {
    opts.transport = options.transport;
  }
  return options.destination ? pino(opts, options.destination) : pino(opts);
}
