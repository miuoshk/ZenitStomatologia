import type { Tx } from "@crux/db";
import { NO_PROVIDER_KEY } from "@crux/db/schema";
import { sql, type SQL } from "drizzle-orm";
import type { MetricParams, MetricRow, MetricScope } from "./types";

/** Widoki per rola — zamknięta mapa (żadnych identyfikatorów od użytkownika). */
const VIEWS = {
  occupancy: {
    self: "analytics.v_self_occupancy",
    location: "analytics.v_location_occupancy",
    network: "analytics.v_network_occupancy",
  },
  capacity: {
    self: null,
    location: "analytics.v_location_capacity",
    network: "analytics.v_network_capacity",
  },
  closures: {
    self: null,
    location: "analytics.v_location_day_closures",
    network: "analytics.v_network_day_closures",
  },
} as const satisfies Record<string, Record<MetricScope, string | null>>;

export type ViewKind = keyof typeof VIEWS;

export function viewFor(kind: ViewKind, scope: MetricScope): SQL {
  const name = VIEWS[kind][scope];
  if (name === null) {
    // Nie powinno się zdarzyć: uprawnienie metryki wyklucza scope=self dla pojemności/zamknięć.
    throw new Error(`widok ${kind} niedostępny dla zakresu ${scope}`);
  }
  return sql.raw(name);
}

function list(values: readonly string[], cast: string): SQL {
  return sql.join(
    values.map((v) => sql`${v}::${sql.raw(cast)}`),
    sql`, `,
  );
}

/** Warunki wspólne dla widoków faktów (`a` = alias). */
export function factWhere(
  a: string,
  p: MetricParams,
  opts: { providers: boolean; categories: boolean },
): SQL {
  const col = (c: string): SQL => sql.raw(`${a}.${c}`);
  const parts: SQL[] = [
    sql`${col("tenant_id")} = ${p.tenantId}::uuid`,
    sql`${col("date_key")} between ${p.from}::date and ${p.to}::date`,
  ];
  if (p.locationIds.length > 0) {
    parts.push(sql`${col("location_id")} in (${list(p.locationIds, "uuid")})`);
  }
  if (opts.providers && p.providerIds.length > 0) {
    parts.push(sql`${col("provider_key")} in (${list(p.providerIds, "uuid")})`);
  }
  if (opts.categories && p.categories.length > 0) {
    parts.push(sql`${col("category_key")} in (${list(p.categories, "text")})`);
  }
  return sql.join(parts, sql` and `);
}

export const occupancyWhere = (a: string, p: MetricParams): SQL =>
  factWhere(a, p, { providers: true, categories: true });

export const capacityWhere = (a: string, p: MetricParams): SQL =>
  factWhere(a, p, { providers: false, categories: false });

export const NO_PROVIDER: SQL = sql`${NO_PROVIDER_KEY}::uuid`;

export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function first(rows: readonly MetricRow[]): MetricRow {
  return rows[0] ?? {};
}

/** Wykonuje zapytanie i zwraca wiersze jako zwykłą tablicę rekordów. */
export async function query(tx: Tx, q: SQL): Promise<MetricRow[]> {
  const result = await tx.execute(q);
  return Array.from(result);
}
