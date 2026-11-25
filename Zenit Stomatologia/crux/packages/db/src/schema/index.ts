/**
 * Schemat Drizzle — tabele + helpery.
 * Tabele platform/audit: migracja `0004_platform.sql` (źródło DDL + funkcje).
 * `db:generate` nie powinien dublować 0004 — journal bez wpisów generowanych dla tych tabel
 * albo ręczny przegląd przed scaleniem.
 */
export { tenantColumns, mutableColumns } from "./columns.js";
export { rls, tableComment, type TableCommentOpts } from "./rls.js";

export {
  platformSchema,
  outbox,
  commandLog,
  featureFlags,
  settings,
} from "./platform.js";

export {
  auditSchema,
  auditEvents,
  accessLog,
  integrityChecks,
} from "./audit.js";
