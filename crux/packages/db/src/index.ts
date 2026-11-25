export { createDb, type CruxDb, type CreateDbOptions, type DbRole, type Tx, type WithActorOptions } from "./client";
export { actorToClaims, type Actor, type JwtClaims, type WorkerClaims } from "./actor";
export { DbMappedError, isDbMappedError } from "./errors";
export {
  PRIVILEGED_OPERATIONS,
  isPrivilegedOperation,
  type PrivilegedOperation,
} from "./privileged";
export {
  tenantColumns,
  mutableColumns,
  rls,
  tableComment,
  type TableCommentOpts,
} from "./schema/index";
/** Re-export — jedna kopia drizzle-orm (unikaj dual-package w workerze). */
export { sql } from "drizzle-orm";

import type { Actor } from "./actor";
import type { CruxDb, Tx, WithActorOptions } from "./client";

/** `withActor(db, actor, fn)` — jedyny dostęp aplikacji do bazy z claims. */
export function withActor<T>(
  db: CruxDb,
  actor: Actor,
  fn: (tx: Tx) => Promise<T>,
  opts?: WithActorOptions,
): Promise<T> {
  return db.withActor(actor, fn, opts);
}

/** `withWorker(db, operation, fn)` — operacje z `privileged.ts`. */
export function withWorker<T>(
  db: CruxDb,
  operation: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.withWorker(operation, fn);
}
