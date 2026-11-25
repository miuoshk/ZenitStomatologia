import { sql } from "drizzle-orm";
import { first, num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const chairHoursWorked: MetricDefinition = {
  id: "chair_hours_worked",
  name: "Godziny pracy foteli",
  definition: "Suma minut wpisów obłożenia ÷ 60.",
  since: "1.0",
  direction: "up",
  goodDirection: "up",
  forma: ["kafel", "slupki"],
  grain: ["gabinet", "fotel", "wykonawca", "kategoria", "dzień"],
  permission: "analytics.view_self",
  unit: "hours",
  sql: (p) => sql`
    select coalesce(sum(o.occupied_minutes), 0) as minutes
    from ${viewFor("occupancy", p.scope)} o
    where ${occupancyWhere("o", p)}`,
  map: (rows) => num(first(rows)["minutes"]) / 60,
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
