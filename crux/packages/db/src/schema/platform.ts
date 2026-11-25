import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgPolicy,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const platformSchema = pgSchema("platform");

export const outbox = platformSchema.table(
  "outbox",
  {
    id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
    tenantId: uuid("tenant_id").notNull(),
    topic: text("topic").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    dedupeKey: text("dedupe_key"),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    unique("outbox_tenant_dedupe_key").on(t.tenantId, t.dedupeKey),
    pgPolicy("outbox_tenant_select", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id()`,
    }),
    pgPolicy("outbox_tenant_insert", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`${t.tenantId} = extensions.tenant_id()`,
    }),
  ],
).enableRLS();

export const commandLog = platformSchema.table(
  "command_log",
  {
    commandId: uuid("command_id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    actorId: uuid("actor_id").notNull(),
    name: text("name").notNull(),
    result: jsonb("result").notNull().$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    pgPolicy("command_log_tenant_select", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id()`,
    }),
    pgPolicy("command_log_tenant_insert", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`${t.tenantId} = extensions.tenant_id()`,
    }),
  ],
).enableRLS();

export const featureFlags = platformSchema.table(
  "feature_flags",
  {
    key: text("key").notNull(),
    tenantId: uuid("tenant_id"),
    locationId: uuid("location_id"),
    enabled: boolean("enabled").notNull().default(false),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
    updatedBy: uuid("updated_by"),
    scopeTenantId: uuid("scope_tenant_id").generatedAlwaysAs(
      sql`coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    scopeLocationId: uuid("scope_location_id").generatedAlwaysAs(
      sql`coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
  },
  (t) => [
    pgPolicy("feature_flags_tenant_select", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} is null or ${t.tenantId} = extensions.tenant_id()`,
    }),
  ],
).enableRLS();

export const settings = platformSchema.table(
  "settings",
  {
    tenantId: uuid("tenant_id").notNull(),
    locationId: uuid("location_id"),
    key: text("key").notNull(),
    value: jsonb("value").notNull().$type<unknown>(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
    updatedBy: uuid("updated_by"),
    scopeLocationId: uuid("scope_location_id").generatedAlwaysAs(
      sql`coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
  },
  (t) => [
    pgPolicy("settings_tenant_select", {
      for: "select",
      to: "authenticated",
      using: sql`${t.tenantId} = extensions.tenant_id()`,
    }),
  ],
).enableRLS();
