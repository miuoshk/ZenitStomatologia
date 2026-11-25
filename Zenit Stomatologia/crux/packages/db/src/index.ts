export { createDb, type CruxDb, type CreateDbOptions, type DbRole, type Tx } from "./client";
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

import type { Actor } from "./actor";
import type { CruxDb, Tx } from "./client";

/** `withActor(db, actor, fn)` — jedyny dostęp aplikacji do bazy z claims. */
export function withActor<T>(
  db: CruxDb,
  actor: Actor,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.withActor(actor, fn);
}

/** `withWorker(db, operation, fn)` — operacje z `privileged.ts`. */
export function withWorker<T>(
  db: CruxDb,
  operation: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.withWorker(operation, fn);
}
