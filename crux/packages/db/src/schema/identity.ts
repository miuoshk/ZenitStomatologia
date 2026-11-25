import { sql } from "drizzle-orm";
import { boolean, date, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const identitySchema = pgSchema("identity");

export const staffRoleEnum = identitySchema.enum("staff_role", [
  "network_admin",
  "location_manager",
  "dentist",
  "hygienist",
  "assistant",
  "receptionist",
  "accountant",
  "auditor",
]);

export type StaffRole = (typeof staffRoleEnum.enumValues)[number];

export const staffMembers = identitySchema.table("staff_members", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  authUserId: uuid("auth_user_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name"),
  title: text("title"),
  npwz: text("npwz"),
  email: text("email").notNull(),
  phone: text("phone"),
  colorKey: text("color_key"),
  active: boolean("active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  updatedBy: uuid("updated_by"),
});

export const memberships = identitySchema.table("memberships", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  staffId: uuid("staff_id").notNull(),
  locationId: uuid("location_id").notNull(),
  role: staffRoleEnum("role").notNull(),
  startsOn: date("starts_on", { mode: "string" }).notNull(),
  endsOn: date("ends_on", { mode: "string" }),
});

export const permissions = identitySchema.table("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = identitySchema.table("role_permissions", {
  role: staffRoleEnum("role").notNull(),
  permission: text("permission").notNull(),
});

export const providerCapabilities = identitySchema.table("provider_capabilities", {
  tenantId: uuid("tenant_id").notNull(),
  staffId: uuid("staff_id").notNull(),
  serviceCategory: text("service_category").notNull(),
});

export const breakGlassRequests = identitySchema.table("break_glass_requests", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  staffId: uuid("staff_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  reason: text("reason").notNull(),
  grantedUntil: timestamp("granted_until", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});
