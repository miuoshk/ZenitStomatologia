import { containsPii } from "./pii";

/**
 * Filtr zdarzeń Sentry (ADR-016): bez PII. Strukturalny — nie importuje `@sentry/*`,
 * więc działa w web (node/edge) i workerze. Użycie: `beforeSend: scrubSentryEvent`.
 */

const REDACTED = "[REDACTED]";

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function scrubText(v: unknown): unknown {
  return typeof v === "string" && containsPii(v) ? REDACTED : v;
}

/** Usuwa dane żądania, ciasteczka, nagłówki, extra, dane breadcrumbs; `user` → `{ id }`. */
export function scrubSentryEvent<T extends object>(event: T): T {
  const e = event as Json;

  if (isObj(e["request"])) {
    const req = e["request"];
    delete req["data"];
    delete req["cookies"];
    delete req["headers"];
    delete req["query_string"];
    delete req["env"];
    if (typeof req["url"] === "string") {
      req["url"] = req["url"].split("?")[0];
    }
  }

  const user = e["user"];
  const userId = isObj(user) ? user["id"] : undefined;
  if (typeof userId === "string" || typeof userId === "number") {
    e["user"] = { id: String(userId) };
  } else {
    delete e["user"];
  }

  delete e["extra"];
  delete e["server_name"];
  if (isObj(e["contexts"])) {
    delete e["contexts"]["culture"];
    delete e["contexts"]["device"];
  }

  e["message"] = scrubText(e["message"]);
  if (isObj(e["logentry"])) {
    e["logentry"]["message"] = scrubText(e["logentry"]["message"]);
    delete e["logentry"]["params"];
  }

  const exception = e["exception"];
  if (isObj(exception) && Array.isArray(exception["values"])) {
    const values: unknown[] = exception["values"];
    for (const val of values) {
      if (isObj(val)) {
        val["value"] = scrubText(val["value"]);
        delete val["vars"];
      }
    }
  }

  const breadcrumbs = e["breadcrumbs"];
  if (Array.isArray(breadcrumbs)) {
    const crumbs: unknown[] = breadcrumbs;
    for (const b of crumbs) {
      if (isObj(b)) {
        delete b["data"];
        b["message"] = scrubText(b["message"]);
      }
    }
  }

  if (isObj(e["tags"])) {
    for (const [k, v] of Object.entries(e["tags"])) {
      e["tags"][k] = scrubText(v);
    }
  }

  return event;
}

export type SentryBaseOptions = {
  readonly dsn: string | undefined;
  readonly environment: string;
  readonly sendDefaultPii: false;
  readonly tracesSampleRate: 0;
  readonly beforeSend: typeof scrubSentryEvent;
  readonly beforeSendTransaction: typeof scrubSentryEvent;
};

/** Wspólne opcje `Sentry.init` (bez session replay; DSN pusty → SDK no-op). */
export function sentryBaseOptions(env: Record<string, string | undefined>): SentryBaseOptions {
  const dsn = env["SENTRY_DSN"]?.trim();
  return {
    dsn: dsn ? dsn : undefined,
    environment: env["SENTRY_ENVIRONMENT"]?.trim() || "local",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
  };
}
