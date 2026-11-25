import {
  drilldownCapacity,
  drilldownOccupancy,
  isMetricId,
  listDashboardChairs,
  listDashboardProviders,
  listUnclosedDays,
  queryLocationBreakdown,
  type CapacityDrilldownRow,
  type MetricId,
  type OccupancyDrilldownRow,
  type UnclosedDay,
} from "@crux/analytics";
import { NO_PROVIDER_KEY } from "@crux/db/schema";
import type { DashboardContext } from "./context";
import { fetchMetric, scalar } from "./components/kpi-cards";

export type ListTab = "licznik" | "mianownik" | "niezamkniete";

export type ControlSum = {
  readonly tile: number | null;
  readonly list: number | null;
  /** Format liczby w sumie kontrolnej. */
  readonly kind: "pct" | "hours" | "grosze" | "grosze_per_hour" | "days";
  readonly match: boolean;
};

export type DrillData = {
  readonly metric: MetricId;
  readonly tab: ListTab;
  readonly tabs: readonly ListTab[];
  readonly occupancy: readonly OccupancyDrilldownRow[];
  readonly capacity: readonly CapacityDrilldownRow[];
  readonly unclosed: readonly UnclosedDay[];
  readonly totals: {
    readonly hours: number;
    readonly amountGrosze: number;
    readonly entries: number;
    readonly availableHours: number | null;
  };
  readonly control: ControlSum;
  readonly names: {
    readonly chairs: ReadonlyMap<string, string>;
    readonly providers: ReadonlyMap<string, string>;
  };
};

export function parseMetricId(raw: string | undefined): MetricId | null {
  return raw && isMetricId(raw) ? raw : null;
}

export function availableTabs(metric: MetricId, canCapacity: boolean): readonly ListTab[] {
  if (metric === "days_closed_rate") return ["niezamkniete"];
  if (metric === "chair_utilization" && canCapacity) return ["licznik", "mianownik"];
  return ["licznik"];
}

function close(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a));
}

/** Dane listy drążenia (suma kontrolna liczona z tych samych faktów co kafel). */
export async function loadDrillData(
  ctx: DashboardContext,
  metric: MetricId,
  requestedTab: string | undefined,
): Promise<DrillData> {
  const filters = ctx.parsed.metric;
  const canCapacity = ctx.actor.permissions.some(
    (p) => p === "analytics.view_location" || p === "analytics.view_network",
  );
  const tabs = availableTabs(metric, canCapacity);
  const tab = (tabs as readonly string[]).includes(requestedTab ?? "") ? (requestedTab as ListTab) : (tabs[0] ?? "licznik");

  const tile = scalar(await fetchMetric(ctx, metric));

  const [dd, chairs, providers] = await Promise.all([
    tab === "niezamkniete" ? null : ctx.run((tx) => drilldownOccupancy(tx, ctx.actor, filters)),
    ctx.exec((tx) => listDashboardChairs(tx, ctx.actor)),
    ctx.run((tx) => listDashboardProviders(tx, ctx.actor, filters)),
  ]);

  let capacity: readonly CapacityDrilldownRow[] = [];
  let totalAvailable: number | null = null;
  if (tab === "mianownik" || (metric === "chair_utilization" && canCapacity)) {
    const cap = await ctx.run((tx) => drilldownCapacity(tx, ctx.actor, filters));
    capacity = tab === "mianownik" ? cap.rows : [];
    totalAvailable = cap.totalAvailableMinutes;
  }

  let unclosed: readonly UnclosedDay[] = [];
  let control: ControlSum;
  const hours = dd ? dd.totalHours : 0;
  const amount = dd ? dd.totalAmountGrosze : 0;

  switch (metric) {
    case "chair_hours_worked":
      control = { tile, list: hours, kind: "hours", match: close(tile, hours) };
      break;
    case "revenue_realized":
    case "revenue_by_category":
      control = { tile, list: amount, kind: "grosze", match: close(tile, amount) };
      break;
    case "revenue_per_chair_hour": {
      const list = hours > 0 ? amount / hours : null;
      control = { tile, list, kind: "grosze_per_hour", match: close(tile, list) };
      break;
    }
    case "provider_hours_worked": {
      const assigned = (dd?.rows ?? [])
        .filter((r) => r.providerKey !== NO_PROVIDER_KEY)
        .reduce((s, r) => s + r.occupiedMinutes, 0);
      control = { tile, list: assigned / 60, kind: "hours", match: close(tile, assigned / 60) };
      break;
    }
    case "chair_utilization": {
      const list = totalAvailable !== null && totalAvailable > 0 ? (dd?.totalMinutes ?? 0) / totalAvailable : null;
      control = { tile, list, kind: "pct", match: close(tile, list) };
      break;
    }
    case "days_closed_rate": {
      const [open, breakdown] = await Promise.all([
        ctx.run((tx) => listUnclosedDays(tx, ctx.actor, filters, 500)),
        ctx.run((tx) => queryLocationBreakdown(tx, ctx.actor, filters)),
      ]);
      unclosed = open.days;
      const working = breakdown.reduce((s, r) => s + r.workingDays, 0);
      const list = working > 0 ? (working - open.total) / working : null;
      control = { tile, list, kind: "pct", match: close(tile, list) };
      break;
    }
  }

  return {
    metric,
    tab,
    tabs,
    occupancy: dd?.rows ?? [],
    capacity,
    unclosed,
    totals: {
      hours,
      amountGrosze: amount,
      entries: dd?.totalEntries ?? 0,
      availableHours: totalAvailable === null ? null : totalAvailable / 60,
    },
    control,
    names: {
      chairs: new Map(chairs.map((c) => [c.id, c.name])),
      providers: new Map(providers.map((p) => [p.id, p.displayName])),
    },
  };
}
