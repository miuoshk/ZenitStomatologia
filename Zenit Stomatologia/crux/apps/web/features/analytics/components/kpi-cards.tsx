import { runMetric, type MetricId, type MetricResult } from "@crux/analytics";
import { PULPIT_LABELS as L } from "@crux/i18n";
import { getSetting } from "@crux/platform";
import { KpiTile, type NumFormat } from "@crux/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardContext } from "../context";
import { CardError } from "../errors";
import { drilldownHref, type DashboardFilterState } from "../filters";
import { guarded } from "./card-frame";

type TileSpec = {
  readonly label: string;
  readonly format: NumFormat;
  readonly unit?: string;
  /** Mnożnik z jednostki metryki (grosze → zł). */
  readonly scale: number;
};

const TILES = {
  chair_utilization: { label: L.tiles.chair_utilization, format: "pct", scale: 1 },
  chair_hours_worked: { label: L.tiles.chair_hours_worked, format: "dec1", unit: L.units.hours, scale: 1 },
  revenue_realized: { label: L.tiles.revenue_realized, format: "pln", scale: 0.01 },
  revenue_per_chair_hour: { label: L.tiles.revenue_per_chair_hour, format: "pln", unit: L.units.perHour, scale: 0.01 },
  days_closed_rate: { label: L.tiles.days_closed_rate, format: "pct", scale: 1 },
  provider_hours_worked: { label: L.tiles.provider_hours_worked, format: "dec1", unit: L.units.hours, scale: 1 },
} as const satisfies Partial<Record<MetricId, TileSpec>>;

export type TileMetric = keyof typeof TILES;

/** Wartość skalarna metryki (słownik godzin per wykonawca → suma). */
export function scalar(result: MetricResult): number | null {
  const v = result.value;
  if (v === null || typeof v === "number") return v;
  return Object.values(v).reduce((a, b) => a + b, 0);
}

export async function fetchMetric(
  ctx: DashboardContext,
  id: MetricId,
  filters = ctx.parsed.metric,
): Promise<MetricResult> {
  const key = `metric:${id}:${JSON.stringify(filters)}`;
  return ctx.once(key, () => ctx.run((tx) => runMetric(tx, ctx.actor, id, filters)));
}

/** Średni cel obłożenia (0–1) dla wybranych gabinetów; `analytics.targets.chair_utilization` (0–100). */
async function utilizationTarget(ctx: DashboardContext): Promise<number | null> {
  const ids = ctx.parsed.metric.locationIds?.length
    ? ctx.parsed.metric.locationIds
    : ctx.locations.map((l) => l.id);
  if (ids.length === 0) return null;
  const targets = await ctx.run(async (tx) => {
    const out: number[] = [];
    for (const id of ids) {
      const r = await getSetting(tx, ctx.actor, "analytics.targets.chair_utilization", id);
      if (!r.ok) return r;
      if (typeof r.value === "number") out.push(r.value);
    }
    return { ok: true as const, value: out };
  });
  return targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length / 100 : null;
}

async function delta(
  ctx: DashboardContext,
  id: TileMetric,
  current: number | null,
): Promise<{ value: number; caption?: string } | null> {
  if (current === null) return null;
  const { porownaj } = ctx.parsed.state;
  if (porownaj === "cel") {
    if (id !== "chair_utilization") return null;
    const target = await utilizationTarget(ctx);
    if (target === null || target <= 0) return null;
    return { value: (current - target) / target, caption: `cel ${String(Math.round(target * 100))}%` };
  }
  if (!ctx.parsed.compareMetric) return null;
  let prev: number | null;
  try {
    prev = scalar(await fetchMetric(ctx, id, ctx.parsed.compareMetric));
  } catch (e) {
    if (e instanceof CardError) return null;
    throw e;
  }
  if (prev === null || prev === 0) return null;
  return { value: (current - prev) / prev };
}

export async function KpiTileCard({
  ctx,
  id,
  drillState,
  label,
}: {
  ctx: DashboardContext;
  id: TileMetric;
  /** Podpis kafla zamiast domyślnego (np. „Moje godziny”). */
  label?: string;
  /** Stan filtrów w linku drążenia (np. wykonawca = ja na „moje”). */
  drillState?: DashboardFilterState;
}): Promise<ReactNode> {
  const spec: TileSpec = { ...TILES[id], label: label ?? TILES[id].label };
  return guarded(spec.label, ctx.href, async () => {
    const result = await fetchMetric(ctx, id);
    const raw = scalar(result);
    const d = await delta(ctx, id, raw);
    const value = raw === null ? null : raw * spec.scale;
    return (
      <Link
        href={drilldownHref(id, drillState ?? ctx.parsed.state)}
        aria-label={`${spec.label}: lista wpisów`}
        className="block rounded-[var(--radius-karta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <KpiTile
          label={spec.label}
          value={value}
          format={spec.format}
          {...(spec.unit ? { unit: spec.unit } : {})}
          {...(d ? { delta: d.value } : {})}
          {...(d?.caption ? { spark: <span className="text-xs text-[var(--text-muted)]">{d.caption}</span> } : {})}
          className="h-full transition-colors hover:border-[var(--zenit-patyna)]"
        />
      </Link>
    );
  });
}
