import { sql } from "drizzle-orm";
import { num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const revenueByCategory: MetricDefinition = {
  id: "revenue_by_category",
  name: "Przychód wg kategorii",
  definition: "revenue_realized w podziale na kategorie Z1–Z+ (grosze).",
  since: "1.0",
  direction: "neutral",
  goodDirection: "neutral",
  forma: ["pasek"],
  grain: ["gabinet", "kategoria"],
  permission: "analytics.view_self",
  unit: "grosze_by_category",
  sql: (p) => sql`
    select k.category_key, k.position, coalesce(sum(o.amount_grosze), 0) as amount
    from analytics.dim_category k
    left join (
      select o.category_key, o.amount_grosze
      from ${viewFor("occupancy", p.scope)} o
      where ${occupancyWhere("o", p)}
    ) o on o.category_key = k.category_key
    group by k.category_key, k.position
    order by k.position`,
  map: (rows) =>
    Object.fromEntries(rows.map((r) => [String(r["category_key"]), num(r["amount"])])),
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
