import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Kolumny wspólne tabel tenantowych: id, tenant_id, created_at, created_by. */
export function tenantColumns() {
  return {
    id: uuid("id").primaryKey().default(sql`extensions.uuid_generate_v7()`),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    createdBy: uuid("created_by"),
  };
}

/** Kolumny mutowalnych tabel: updated_at, updated_by. */
export function mutableColumns() {
  return {
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
    updatedBy: uuid("updated_by"),
  };
}
