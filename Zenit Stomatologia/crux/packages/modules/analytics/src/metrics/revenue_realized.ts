import { sql } from "drizzle-orm";
import { first, num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const revenueRealized: MetricDefinition = {
  id: "revenue_realized",
  name: "Przychód zrealizowany",
  definition:
    "Suma kwot (w groszach) z wpisów obłożenia. W 1.0 źródło: wpisy obłożenia; zmieni się w 2.0 bez zmiany id.",
  since: "1.0",
  direction: "up",
  goodDirection: "up",
  forma: ["kafel", "linia"],
  grain: ["gabinet", "wykonawca", "kategoria", "dzień"],
  permission: "analytics.view_self",
  unit: "grosze",
  sql: (p) => sql`
    select coalesce(sum(o.amount_grosze), 0) as amount
    from ${viewFor("occupancy", p.scope)} o
    where ${occupancyWhere("o", p)}`,
  map: (rows) => num(first(rows)["amount"]),
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
