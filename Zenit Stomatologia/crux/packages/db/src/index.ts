export { createDb, type CruxDb, type CreateDbOptions, type DbRole, type Tx } from "./client.js";
export { actorToClaims, type Actor, type JwtClaims, type WorkerClaims } from "./actor.js";
export { DbMappedError, isDbMappedError } from "./errors.js";
export {
  PRIVILEGED_OPERATIONS,
  isPrivilegedOperation,
  type PrivilegedOperation,
} from "./privileged.js";
export {
  tenantColumns,
  mutableColumns,
  rls,
  tableComment,
  type TableCommentOpts,
} from "./schema/index.js";

import type { Actor } from "./actor.js";
import type { CruxDb, Tx } from "./client.js";

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
