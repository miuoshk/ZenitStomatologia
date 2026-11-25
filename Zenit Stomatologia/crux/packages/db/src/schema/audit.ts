import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  jsonb,
  pgPolicy,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const auditSchema = pgSchema("audit");

export const auditEvents = auditSchema.table(
  "events",
  {
    id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
    tenantId: uuid("tenant_id").notNull(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    tableName: text("table_name").notNull(),
    rowId: uuid("row_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    reason: text("reason"),
    requestId: text("request_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    pgPolicy("events_audit_read", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id() and extensions.has_permission('audit.read')`,
    }),
  ],
).enableRLS();

export const accessLog = auditSchema.table(
  "access_log",
  {
    id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
    tenantId: uuid("tenant_id").notNull(),
    actorId: uuid("actor_id").notNull(),
    locationId: uuid("location_id"),
    patientId: uuid("patient_id").notNull(),
    resource: text("resource").notNull(),
    resourceId: uuid("resource_id"),
    action: text("action").notNull(),
    justification: text("justification"),
    ipHash: bytea("ip_hash"),
    userAgentHash: bytea("user_agent_hash"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    pgPolicy("access_log_audit_read", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id() and extensions.has_permission('audit.read')`,
    }),
  ],
).enableRLS();

export const integrityChecks = auditSchema.table(
  "integrity_checks",
  {
    id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
    tenantId: uuid("tenant_id").notNull(),
    patientId: uuid("patient_id"),
    checkedAt: timestamp("checked_at", { withTimezone: true, mode: "date" }).notNull(),
    ok: boolean("ok").notNull(),
    brokenAtVersionId: uuid("broken_at_version_id"),
    details: text("details"),
  },
  (t) => [
    pgPolicy("integrity_audit_read", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id() and extensions.has_permission('audit.read')`,
    }),
  ],
).enableRLS();
