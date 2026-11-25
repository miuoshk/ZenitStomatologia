import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { occupancySourceEnum } from "./scheduling";

/** DDL: `0013_analytics.sql` (źródło prawdy; widoki `v_*` tylko tam). */
export const analyticsSchema = pgSchema("analytics");

/** Wartownik `provider_key` dla wpisów bez wykonawcy (PK wymaga NOT NULL). */
export const NO_PROVIDER_KEY = "00000000-0000-7000-8000-000000000000";

export const dimDate = analyticsSchema.table("dim_date", {
  dateKey: date("date_key", { mode: "string" }).primaryKey(),
  isoWeek: integer("iso_week").notNull(),
  isoYear: integer("iso_year").notNull(),
  month: integer("month").notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  /** ISO: 1 = poniedziałek … 7 = niedziela. */
  weekday: smallint("weekday").notNull(),
  isHoliday: boolean("is_holiday").notNull(),
  isWorkingDay: boolean("is_working_day").notNull(),
});

export const dimLocation = analyticsSchema.table("dim_location", {
  locationKey: uuid("location_key").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  number: text("number").notNull(),
  name: text("name").notNull(),
  colorKey: text("color_key").notNull(),
  active: boolean("active").notNull(),
});

export const dimChair = analyticsSchema.table("dim_chair", {
  chairKey: uuid("chair_key").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  locationKey: uuid("location_key").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  active: boolean("active").notNull(),
});

/** Tylko dane pracownicze: display_name, title, role (bez kontaktu). */
export const dimProvider = analyticsSchema.table("dim_provider", {
  providerKey: uuid("provider_key").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  displayName: text("display_name").notNull(),
  title: text("title"),
  role: text("role").notNull(),
});

export const dimCategory = analyticsSchema.table("dim_category", {
  categoryKey: text("category_key").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

const refreshedAt = () =>
  timestamp("refreshed_at", { withTimezone: true, mode: "date" }).notNull();

export const factChairCapacity = analyticsSchema.table(
  "fact_chair_capacity",
  {
    tenantId: uuid("tenant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    chairKey: uuid("chair_key").notNull(),
    dateKey: date("date_key", { mode: "string" }).notNull(),
    openMinutes: integer("open_minutes").notNull(),
    blockedMinutes: integer("blocked_minutes").notNull(),
    availableMinutes: integer("available_minutes").notNull(),
    refreshedAt: refreshedAt(),
  },
  (t) => [primaryKey({ columns: [t.chairKey, t.dateKey] })],
);

export const factChairOccupancy = analyticsSchema.table(
  "fact_chair_occupancy",
  {
    tenantId: uuid("tenant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    chairKey: uuid("chair_key").notNull(),
    dateKey: date("date_key", { mode: "string" }).notNull(),
    providerKey: uuid("provider_key").notNull(),
    categoryKey: text("category_key").notNull(),
    occupiedMinutes: integer("occupied_minutes").notNull(),
    amountGrosze: bigint("amount_grosze", { mode: "bigint" }).notNull().default(sql`0`),
    entries: integer("entries").notNull(),
    source: occupancySourceEnum("source").notNull(),
    refreshedAt: refreshedAt(),
  },
  (t) => [
    primaryKey({
      columns: [t.chairKey, t.dateKey, t.providerKey, t.categoryKey, t.source],
    }),
  ],
);

export const factDayClosures = analyticsSchema.table(
  "fact_day_closures",
  {
    tenantId: uuid("tenant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    dateKey: date("date_key", { mode: "string" }).notNull(),
    closed: boolean("closed").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    refreshedAt: refreshedAt(),
  },
  (t) => [primaryKey({ columns: [t.locationId, t.dateKey] })],
);

export const refreshLog = analyticsSchema.table("refresh_log", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  windowFrom: timestamp("window_from", { withTimezone: true, mode: "date" }).notNull(),
  windowTo: timestamp("window_to", { withTimezone: true, mode: "date" }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  rowsWritten: integer("rows_written"),
  /** `incremental` | `full`. */
  mode: text("mode").notNull().$type<"incremental" | "full">(),
});
