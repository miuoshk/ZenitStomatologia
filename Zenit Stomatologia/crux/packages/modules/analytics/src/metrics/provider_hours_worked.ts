import { sql } from "drizzle-orm";
import { NO_PROVIDER, num, occupancyWhere, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const providerHoursWorked: MetricDefinition = {
  id: "provider_hours_worked",
  name: "Godziny wykonawców",
  definition:
    "Suma minut wpisów per wykonawca ÷ 60 (klucz = provider_key; wpisy bez wykonawcy pominięte).",
  since: "1.0",
  direction: "neutral",
  goodDirection: "neutral",
  forma: ["slupki", "kafel"],
  grain: ["gabinet", "wykonawca", "kategoria"],
  permission: "analytics.view_self",
  unit: "hours_by_provider",
  sql: (p) => sql`
    select o.provider_key, sum(o.occupied_minutes) as minutes
    from ${viewFor("occupancy", p.scope)} o
    where ${occupancyWhere("o", p)} and o.provider_key <> ${NO_PROVIDER}
    group by o.provider_key
    order by o.provider_key`,
  map: (rows) =>
    Object.fromEntries(rows.map((r) => [String(r["provider_key"]), num(r["minutes"]) / 60])),
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet", "wykonawca", "kategoria"] },
};
