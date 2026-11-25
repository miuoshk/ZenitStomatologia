import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orgSchema = pgSchema("org");

export const tenants = orgSchema.table("tenants", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  nip: text("nip"),
  regon: text("regon"),
  rpwdlBookNumber: text("rpwdl_book_number"),
  address: jsonb("address"),
  timeZone: text("time_zone").notNull().default("Europe/Warsaw"),
  dekKeyId: text("dek_key_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const locations = orgSchema.table("locations", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  number: text("number").notNull(),
  name: text("name").notNull(),
  resortCode: text("resort_code"),
  address: jsonb("address").notNull().$type<Record<string, unknown>>(),
  phone: text("phone"),
  email: text("email"),
  colorKey: text("color_key").notNull(),
  active: boolean("active").notNull().default(true),
  openedOn: date("opened_on", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  updatedBy: uuid("updated_by"),
});

export const chairs = orgSchema.table("chairs", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  equipment: text("equipment").array().notNull().default(sql`'{}'`),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  updatedBy: uuid("updated_by"),
});

export const openingHours = orgSchema.table("opening_hours", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  weekday: smallint("weekday").notNull(),
  opens: time("opens").notNull(),
  closes: time("closes").notNull(),
  validFrom: date("valid_from", { mode: "string" }).notNull(),
  validTo: date("valid_to", { mode: "string" }),
});

export const openingExceptions = orgSchema.table("opening_exceptions", {
  id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  day: date("day", { mode: "string" }).notNull(),
  opens: time("opens"),
  closes: time("closes"),
  closed: boolean("closed").notNull().default(false),
  reason: text("reason"),
});
