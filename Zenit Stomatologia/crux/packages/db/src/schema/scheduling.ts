import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** tstzrange as string literal `[start,end)` — domena buduje przez hourRange. */
const tstzrange = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tstzrange";
  },
});

export const schedulingSchema = pgSchema("scheduling");

export const occupancySourceEnum = schedulingSchema.enum("occupancy_source", [
  "manual",
  "appointment",
  "import",
]);

export type OccupancySource = (typeof occupancySourceEnum.enumValues)[number];

export const timeBlocks = schedulingSchema.table("time_blocks", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  staffId: uuid("staff_id"),
  chairId: uuid("chair_id"),
  period: tstzrange("period").notNull(),
  kind: text("kind").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by"),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  endedBy: uuid("ended_by"),
});

export const chairOccupancy = schedulingSchema.table("chair_occupancy", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  chairId: uuid("chair_id").notNull(),
  providerId: uuid("provider_id"),
  period: tstzrange("period").notNull(),
  category: text("category").notNull(),
  amountGrosze: bigint("amount_grosze", { mode: "bigint" }),
  source: occupancySourceEnum("source").notNull().default("manual"),
  appointmentId: uuid("appointment_id"),
  overrideReason: text("override_reason"),
  note: text("note"),
  voidedAt: timestamp("voided_at", { withTimezone: true, mode: "date" }),
  voidedBy: uuid("voided_by"),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  updatedBy: uuid("updated_by"),
});

export const occupancyDayClosures = schedulingSchema.table("occupancy_day_closures", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  day: date("day").notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  closedBy: uuid("closed_by").notNull(),
  summary: jsonb("summary").notNull().$type<{
    hours: number;
    amount_grosze: number;
    chairs_without_entries: string[];
  }>(),
  reopenedAt: timestamp("reopened_at", { withTimezone: true, mode: "date" }),
  reopenedBy: uuid("reopened_by"),
  reopenReason: text("reopen_reason"),
});
