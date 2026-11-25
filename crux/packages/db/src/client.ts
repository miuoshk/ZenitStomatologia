import { mapPgError } from "@crux/shared/errors";
import type { DomainError, TechnicalError } from "@crux/shared/result";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { actorToClaims, type Actor, type WorkerClaims } from "./actor";
import { DbMappedError } from "./errors";
import { isPrivilegedOperation, PRIVILEGED_OPERATIONS } from "./privileged";
import * as schema from "./schema/index";

export type DbRole = "app" | "worker";

export type CreateDbOptions = {
  readonly role: DbRole;
  /** Nadpisuje domyślną listę z `privileged.ts` (tylko worker). */
  readonly privilegedOperations?: readonly string[];
};

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export type Tx = Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0];

export type WithActorOptions = {
  /** Trafia do `crux.request_id` → `audit.events.request_id` (korelacja z logami). */
  readonly requestId?: string;
};

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export type CruxDb = {
  readonly role: DbRole;
  readonly drizzle: DrizzleDb;
  withActor<T>(actor: Actor, fn: (tx: Tx) => Promise<T>, opts?: WithActorOptions): Promise<T>;
  withWorker<T>(operation: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

/**
 * Klient DB: postgres.js + Drizzle.
 * `prepare: false` — tryb transakcyjny Supavisor (ADR-005).
 * Zero `service_role` / `supabase-js`.
 */
export function createDb(url: string, options: CreateDbOptions): CruxDb {
  const max = options.role === "app" ? 10 : 5;
  const client = postgres(url, { max, prepare: false });
  const db = drizzle(client, { schema });
  const privileged = new Set(options.privilegedOperations ?? PRIVILEGED_OPERATIONS);

  async function withActor<T>(
    actor: Actor,
    fn: (tx: Tx) => Promise<T>,
    opts?: WithActorOptions,
  ): Promise<T> {
    if (options.role !== "app") {
      throw new DbMappedError(domainForbidden("withActor wymaga createDb(..., { role: 'app' })"));
    }
    const claims = JSON.stringify(actorToClaims(actor));
    // Tylko bezpieczny format (bez PII); inne wartości są pomijane.
    const requestId =
      opts?.requestId !== undefined && REQUEST_ID_RE.test(opts.requestId) ? opts.requestId : null;
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql.raw("set local role authenticated"));
        await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
        if (requestId !== null) {
          await tx.execute(sql`select set_config('crux.request_id', ${requestId}, true)`);
        }
        await tx.execute(sql.raw("set local statement_timeout = '15s'"));
        return fn(tx);
      });
    } catch (error) {
      throw mapOrRethrow(error);
    }
  }

  async function withWorker<T>(operation: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (options.role !== "worker") {
      throw new DbMappedError(
        domainForbidden("withWorker wymaga createDb(..., { role: 'worker' })"),
      );
    }
    if (!isPrivilegedOperation(operation, privileged)) {
      throw new DbMappedError(
        domainForbidden(`nieznana operacja uprzywilejowana: ${operation}`),
      );
    }
    const claims: WorkerClaims = { worker: true, operation };
    const claimsJson = JSON.stringify(claims);
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql.raw("set local role crux_worker"));
        await tx.execute(sql`select set_config('request.jwt.claims', ${claimsJson}, true)`);
        await tx.execute(sql.raw("set local statement_timeout = '15s'"));
        return fn(tx);
      });
    } catch (error) {
      throw mapOrRethrow(error);
    }
  }

  return {
    role: options.role,
    drizzle: db,
    withActor,
    withWorker,
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}

function domainForbidden(reason: string): DomainError {
  return { type: "forbidden", details: { reason } };
}

function mapOrRethrow(error: unknown): Error {
  if (error instanceof DbMappedError) return error;
  if (isDomainError(error) || isTechnicalError(error)) {
    return new DbMappedError(error);
  }
  const mapped = mapPgError(error);
  if (!mapped.ok) return new DbMappedError(mapped.error);
  return new DbMappedError({ type: "technical", code: "unknown", cause: error });
}

function errorType(error: object): unknown {
  if (!("type" in error)) return undefined;
  return Reflect.get(error, "type");
}

function isDomainError(error: unknown): error is DomainError {
  if (typeof error !== "object" || error === null) return false;
  const type = errorType(error);
  return (
    typeof type === "string" &&
    ["conflict", "forbidden", "not_found", "validation", "invariant"].includes(type)
  );
}

function isTechnicalError(error: unknown): error is TechnicalError {
  if (typeof error !== "object" || error === null) return false;
  return errorType(error) === "technical";
}
