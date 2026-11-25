/**
 * Schemat Drizzle — tabele + helpery.
 * Tabele platform/audit: migracja `0004_platform.sql` (źródło DDL + funkcje).
 * `db:generate` nie powinien dublować 0004 — journal bez wpisów generowanych dla tych tabel
 * albo ręczny przegląd przed scaleniem.
 */
export { tenantColumns, mutableColumns } from "./columns";
export { rls, tableComment, type TableCommentOpts } from "./rls";

export {
  platformSchema,
  outbox,
  commandLog,
  featureFlags,
  settings,
} from "./platform";

export {
  auditSchema,
  auditEvents,
  accessLog,
  integrityChecks,
} from "./audit";

export {
  orgSchema,
  tenants,
  locations,
  chairs,
  openingHours,
  openingExceptions,
} from "./org";

export {
  identitySchema,
  staffRoleEnum,
  staffMembers,
  memberships,
  permissions,
  rolePermissions,
  providerCapabilities,
  breakGlassRequests,
  type StaffRole,
} from "./identity";
