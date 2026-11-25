/** @crux/analytics — schemat `analytics` (1.0): zasilanie + rejestr metryk. */
export {
  refreshAnalytics,
  type RefreshOptions,
  type RefreshResult,
} from "./refresh/refresh";
export { dayWindow, fullWindow, incrementalWindow } from "./refresh/windows";
export { metricRegistry, METRIC_IDS, isMetricId, type MetricId } from "./metrics/registry";
export { runMetric, type RunMetricOptions } from "./metrics/run-metric";
export {
  drilldownOccupancy,
  drilldownCapacity,
  type OccupancyDrilldown,
  type OccupancyDrilldownRow,
  type CapacityDrilldownRow,
} from "./metrics/drilldown";
export {
  listDashboardLocations,
  listDashboardProviders,
  listDashboardChairs,
  type DashboardChair,
  type DashboardProvider,
  queryWeeklyRevenue,
  queryLocationBreakdown,
  queryDailyUtilization,
  queryHoursByChair,
  queryProviderBreakdown,
  listUnclosedDays,
  latestRefreshAt,
  type DashboardLocation,
  type WeeklyRevenueRow,
  type LocationBreakdownRow,
  type DailyUtilizationRow,
  type ChairHoursRow,
  type ProviderBreakdownRow,
  type UnclosedDay,
} from "./queries/dashboard";
export { clearMetricCache, stableSerialize } from "./metrics/cache";
export type {
  ClampedFilters,
  MetricDefinition,
  MetricFilters,
  MetricForma,
  MetricPermission,
  MetricResult,
  MetricScope,
  MetricUnit,
  MetricValue,
} from "./metrics/types";
