import { sql } from "drizzle-orm";
import { capacityWhere, first, num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const chairUtilization: MetricDefinition = {
  id: "chair_utilization",
  name: "Obłożenie foteli",
  definition: "Minuty wpisów obłożenia ÷ dostępne minuty foteli (otwarcie minus blokady).",
  since: "1.0",
  direction: "up",
  goodDirection: "up",
  forma: ["kafel", "luk"],
  grain: ["gabinet", "fotel", "wykonawca", "dzień"],
  permission: "analytics.view_location",
  unit: "ratio",
  sql: (p) => sql`
    select
      (select coalesce(sum(o.occupied_minutes), 0)
         from ${viewFor("occupancy", p.scope)} o where ${occupancyWhere("o", p)}) as occupied,
      (select coalesce(sum(c.available_minutes), 0)
         from ${viewFor("capacity", p.scope)} c where ${capacityWhere("c", p)}) as available`,
  map: (rows) => {
    const r = first(rows);
    const available = num(r["available"]);
    return available > 0 ? num(r["occupied"]) / available : null;
  },
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
