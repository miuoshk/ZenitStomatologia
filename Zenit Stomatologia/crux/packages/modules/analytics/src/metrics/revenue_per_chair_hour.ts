import { sql } from "drizzle-orm";
import { first, num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const revenuePerChairHour: MetricDefinition = {
  id: "revenue_per_chair_hour",
  name: "Przychód na godzinę fotela",
  definition:
    "revenue_realized ÷ chair_hours_worked (godziny z kwotą i bez); wynik w groszach na godzinę.",
  since: "1.0",
  direction: "up",
  goodDirection: "up",
  forma: ["kafel", "kropkowy"],
  grain: ["gabinet", "fotel", "wykonawca"],
  permission: "analytics.view_self",
  unit: "grosze_per_hour",
  sql: (p) => sql`
    select coalesce(sum(o.amount_grosze), 0) as amount,
           coalesce(sum(o.occupied_minutes), 0) as minutes
    from ${viewFor("occupancy", p.scope)} o
    where ${occupancyWhere("o", p)}`,
  map: (rows) => {
    const r = first(rows);
    const minutes = num(r["minutes"]);
    return minutes > 0 ? num(r["amount"]) / (minutes / 60) : null;
  },
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
