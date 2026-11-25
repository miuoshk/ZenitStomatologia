import { chairHoursWorked } from "./chair_hours_worked";
import { chairUtilization } from "./chair_utilization";
import { daysClosedRate } from "./days_closed_rate";
import { providerHoursWorked } from "./provider_hours_worked";
import { revenueByCategory } from "./revenue_by_category";
import { revenuePerChairHour } from "./revenue_per_chair_hour";
import { revenueRealized } from "./revenue_realized";
import type { MetricDefinition } from "./types";

/** Metryki wydania 1.0 (`docs/11`, 4.7). Każda czyta tylko `analytics.*`. */
export const metricRegistry = {
  chair_utilization: chairUtilization,
  chair_hours_worked: chairHoursWorked,
  revenue_realized: revenueRealized,
  revenue_per_chair_hour: revenuePerChairHour,
  revenue_by_category: revenueByCategory,
  provider_hours_worked: providerHoursWorked,
  days_closed_rate: daysClosedRate,
} as const satisfies Record<string, MetricDefinition>;

export type MetricId = keyof typeof metricRegistry;

export const METRIC_IDS = Object.keys(metricRegistry) as MetricId[];

export function isMetricId(id: string): id is MetricId {
  return Object.hasOwn(metricRegistry, id);
}
