import { sql } from "drizzle-orm";
import { capacityWhere, first, num, viewFor } from "./sql";
import type { MetricDefinition } from "./types";

export const daysClosedRate: MetricDefinition = {
  id: "days_closed_rate",
  name: "Dni zamknięte",
  definition:
    "Dni robocze gabinetu (otwarcie > 0 min) z zamknięciem dnia ÷ dni robocze gabinetu w okresie.",
  since: "1.0",
  direction: "up",
  goodDirection: "up",
  forma: ["kafel", "kalendarz"],
  grain: ["gabinet"],
  permission: "analytics.view_location",
  unit: "ratio",
  sql: (p) => sql`
    with wd as (
      select c.location_id, c.date_key
      from ${viewFor("capacity", p.scope)} c
      where ${capacityWhere("c", p)} and c.open_minutes > 0
      group by c.location_id, c.date_key
    )
    select count(*) as working_days,
           count(*) filter (where exists (
             select 1 from ${viewFor("closures", p.scope)} x
             where x.location_id = wd.location_id and x.date_key = wd.date_key and x.closed
           )) as closed_days
    from wd`,
  map: (rows) => {
    const r = first(rows);
    const total = num(r["working_days"]);
    return total > 0 ? num(r["closed_days"]) / total : null;
  },
  drilldown: { entity: "oblozenie", filters: ["okres", "gabinet"] },
};
