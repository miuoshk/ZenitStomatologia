import {
  latestRefreshAt,
  listUnclosedDays,
  queryDailyUtilization,
  queryHoursByChair,
  queryLocationBreakdown,
  queryProviderBreakdown,
  queryWeeklyRevenue,
  type DashboardLocation,
  type LocationBreakdownRow,
} from "@crux/analytics";
import { PULPIT_LABELS as L } from "@crux/i18n";
import { formatDateTimePl } from "@crux/shared/time";
import {
  ArchGauge,
  BarList,
  Card,
  CardHeader,
  DotCalendar,
  DotPlot,
  LineChart,
  PartsBar,
  TableView,
  formatNumber,
} from "@crux/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardContext } from "../context";
import { addDays, dayCount, longDatePl, shortDatePl } from "../dates";
import { drilldownHref, viewFor } from "../filters";
import { hoursFromMinutes, locationColor, zlote } from "../format";
import { EmptyCard, guarded } from "./card-frame";
import { fetchMetric } from "./kpi-cards";
import { PulpitChartCard } from "./pulpit-chart-card";

function colorOf(locations: readonly DashboardLocation[], id: string): string {
  const i = locations.findIndex((l) => l.id === id);
  const l = locations[i];
  return locationColor(l?.colorKey ?? "", Math.max(i, 0));
}

function locationLabel(locations: readonly DashboardLocation[], id: string): string {
  const l = locations.find((x) => x.id === id);
  return l ? `${l.number} ${l.name}` : "Gabinet";
}

function Legend({ locations, ids }: { locations: readonly DashboardLocation[]; ids: readonly string[] }) {
  return (
    <>
      {ids.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: colorOf(locations, id) }} />
          {locationLabel(locations, id)}
        </span>
      ))}
    </>
  );
}

/** Dane per gabinet wspólne dla łuków i wykresu kropkowego. */
function breakdown(ctx: DashboardContext): Promise<readonly LocationBreakdownRow[]> {
  return ctx.once(`breakdown:${JSON.stringify(ctx.parsed.metric)}`, () =>
    ctx.run((tx) => queryLocationBreakdown(tx, ctx.actor, ctx.parsed.metric)),
  );
}

const scroll = "overflow-x-auto";

// ---------------------------------------------------------------- wykres główny

export function RevenueWeeklyCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.revenueWeekly, ctx.href, async () => {
    const rows = await ctx.run((tx) => queryWeeklyRevenue(tx, ctx.actor, ctx.parsed.metric));
    if (rows.length === 0) return <EmptyCard title={L.cards.revenueWeekly} hint={L.cards.revenueWeeklyHint} />;
    const ids = [...new Set(rows.map((r) => r.locationId))].sort();
    const weeks = [...new Set(rows.map((r) => r.weekStart))].sort();
    const data = weeks.map((w) => {
      const row: Record<string, string | number> = { tydzien: shortDatePl(w) };
      for (const id of ids) {
        row[id] = zlote(rows.find((r) => r.weekStart === w && r.locationId === id)?.amountGrosze ?? 0);
      }
      return row;
    });
    const series = ids.map((id) => ({
      key: id,
      name: locationLabel(ctx.locations, id),
      color: colorOf(ctx.locations, id),
    }));
    const label = `${L.cards.revenueWeekly} (zł)`;
    const refreshedAt = await ctx.once("refresh", () => ctx.exec((tx) => latestRefreshAt(tx)));
    return (
      <PulpitChartCard
        cardId="przychod"
        title={L.cards.revenueWeekly}
        hint={L.cards.revenueWeeklyHint}
        defaultView={viewFor(ctx.parsed.state, "przychod")}
        legend={<Legend locations={ctx.locations} ids={ids} />}
        chart={<LineChart data={data} xKey="tydzien" series={series} label={label} />}
        table={<LineChart data={data} xKey="tydzien" series={series} label={label} asTable />}
        {...(refreshedAt ? { refreshedAt } : {})}
      />
    );
  });
}

// ---------------------------------------------------------------- łuki obłożenia

export function GaugesCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.gauges, ctx.href, async () => {
    const rows = (await breakdown(ctx)).filter((r) => r.availableMinutes > 0);
    if (rows.length === 0) return <EmptyCard title={L.cards.gauges} />;
    const items = rows.map((r) => {
      const loc = ctx.locations.find((l) => l.id === r.locationId);
      return { r, name: locationLabel(ctx.locations, r.locationId), number: loc?.number ?? "" };
    });
    return (
      <PulpitChartCard
        cardId="luki"
        title={L.cards.gauges}
        defaultView={viewFor(ctx.parsed.state, "luki")}
        chart={
          <div className="flex flex-wrap items-start gap-6">
            {items.map(({ r, name, number }) => (
              <Link
                key={r.locationId}
                href={drilldownHref("chair_utilization", { ...ctx.parsed.state, gabinet: number ? [number] : [] })}
                aria-label={`${name}: lista wpisów`}
                className="rounded-[var(--radius-karta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                <ArchGauge value={r.occupiedMinutes / r.availableMinutes} label={name} width={220} />
              </Link>
            ))}
          </div>
        }
        table={
          <TableView
            caption={L.cards.gauges}
            columns={["Gabinet", "Obłożenie", "Godziny wpisów", "Dostępne godziny"]}
            rows={items.map(({ r, name }) => [
              name,
              formatNumber(r.occupiedMinutes / r.availableMinutes, "pct"),
              formatNumber(hoursFromMinutes(r.occupiedMinutes), "dec1"),
              formatNumber(hoursFromMinutes(r.availableMinutes), "dec1"),
            ])}
          />
        }
      />
    );
  });
}

// ---------------------------------------------------------------- porównanie gabinetów

export function CompareCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.compare, ctx.href, async () => {
    const rows = (await breakdown(ctx)).filter((r) => r.availableMinutes > 0 || r.occupiedMinutes > 0);
    if (rows.length === 0) return <EmptyCard title={L.cards.compare} hint={L.cards.compareHint} />;
    const series = (pick: (r: LocationBreakdownRow) => number) =>
      rows.map((r) => ({
        color: colorOf(ctx.locations, r.locationId),
        name: locationLabel(ctx.locations, r.locationId),
        value: pick(r),
      }));
    const util = (r: LocationBreakdownRow) => (r.availableMinutes > 0 ? (r.occupiedMinutes / r.availableMinutes) * 100 : 0);
    const closed = (r: LocationBreakdownRow) => (r.workingDays > 0 ? (r.closedDays / r.workingDays) * 100 : 0);
    const perHour = (r: LocationBreakdownRow) => (r.occupiedMinutes > 0 ? zlote(r.amountGrosze) / hoursFromMinutes(r.occupiedMinutes) : 0);
    const hours = (r: LocationBreakdownRow) => hoursFromMinutes(r.occupiedMinutes);
    const ceil = (vals: number[]) => Math.max(10, Math.ceil((Math.max(...vals, 0) * 1.15) / 10) * 10);
    const perHourMax = ceil(rows.map(perHour));
    const hoursMax = ceil(rows.map(hours));
    const pctRows = [
      { label: "Obłożenie", series: series(util) },
      { label: "Dni zamknięte", series: series(closed) },
    ];
    return (
      <PulpitChartCard
        cardId="porownanie"
        title={L.cards.compare}
        hint={L.cards.compareHint}
        defaultView={viewFor(ctx.parsed.state, "porownanie")}
        legend={<Legend locations={ctx.locations} ids={rows.map((r) => r.locationId)} />}
        chart={
          <div className={`${scroll} flex flex-col gap-4`}>
            <DotPlot rows={pctRows} min={0} max={100} unit="%" label="Obłożenie i dni zamknięte" width={520} />
            <DotPlot rows={[{ label: "Przychód na godzinę", series: series(perHour) }]} min={0} max={perHourMax} unit=" zł/h" label="Przychód na godzinę fotela" width={520} />
            <DotPlot rows={[{ label: "Godziny wpisów", series: series(hours) }]} min={0} max={hoursMax} unit=" h" label="Godziny wpisów" width={520} />
          </div>
        }
        table={
          <TableView
            caption={L.cards.compare}
            columns={["Gabinet", "Obłożenie", "Dni zamknięte", "Przychód na godzinę", "Godziny wpisów"]}
            rows={rows.map((r) => [
              locationLabel(ctx.locations, r.locationId),
              `${formatNumber(util(r))}%`,
              `${formatNumber(closed(r))}%`,
              `${formatNumber(perHour(r))} zł/h`,
              `${formatNumber(hours(r))} h`,
            ])}
          />
        }
      />
    );
  });
}

// ---------------------------------------------------------------- struktura przychodu

const CATEGORY_COLORS: Record<string, string> = {
  Z1: "var(--kolornik-z1-pasek)",
  Z2: "var(--kolornik-z2-pasek)",
  Z3: "var(--kolornik-z3-pasek)",
  Z4: "var(--kolornik-z4-pasek)",
  Z5: "var(--kolornik-z5-pasek)",
  "Z+": "var(--kolornik-zplus-pasek)",
};

export function CategoriesCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.categories, ctx.href, async () => {
    const result = await fetchMetric(ctx, "revenue_by_category");
    const value = typeof result.value === "object" && result.value !== null ? result.value : {};
    const parts = Object.entries(value)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ label: k, value: v, color: CATEGORY_COLORS[k] ?? "var(--zenit-patyna)" }));
    if (parts.length === 0) return <EmptyCard title={L.cards.categories} hint={L.cards.categoriesHint} />;
    const total = parts.reduce((a, p) => a + p.value, 0);
    return (
      <PulpitChartCard
        cardId="kategorie"
        title={L.cards.categories}
        hint={L.cards.categoriesHint}
        defaultView={viewFor(ctx.parsed.state, "kategorie")}
        legend={parts.map((p) => (
          <Link
            key={p.label}
            href={drilldownHref("revenue_by_category", { ...ctx.parsed.state, kategoria: [p.label] })}
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] underline-offset-2 hover:underline"
          >
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.label} · {formatNumber(zlote(p.value), "pln")}
          </Link>
        ))}
        chart={
          <div className={scroll}>
            <PartsBar parts={parts} label="Struktura przychodu wg kategorii" />
          </div>
        }
        table={
          <TableView
            caption={L.cards.categories}
            columns={["Kategoria", "Kwota", "Udział"]}
            rows={parts.map((p) => [p.label, formatNumber(zlote(p.value), "pln"), formatNumber(p.value / total, "pct")])}
          />
        }
      />
    );
  });
}

// ---------------------------------------------------------------- rytm dni

const MAX_CALENDAR_DAYS = 400;

export function RhythmCard({ ctx, mine = false }: { ctx: DashboardContext; mine?: boolean }): Promise<ReactNode> {
  const title = mine ? L.cards.mineRhythm : L.cards.rhythm;
  const hint = mine ? L.cards.mineRhythmHint : L.cards.rhythmHint;
  return guarded(title, ctx.href, async () => {
    const rows = await ctx.run((tx) => queryDailyUtilization(tx, ctx.actor, ctx.parsed.metric));
    if (rows.length === 0) return <EmptyCard title={title} hint={hint} />;
    const { from, to } = ctx.parsed.period;
    const end = to < ctx.today ? to : ctx.today;
    const start = dayCount(from, end) > MAX_CALENDAR_DAYS ? addDays(end, -(MAX_CALENDAR_DAYS - 1)) : from;
    const byDate = new Map(rows.map((r) => [r.dateKey, r]));
    const best = Math.max(...rows.map((r) => r.occupiedMinutes), 1);
    const days = [];
    for (let d = start as string; d <= end; d = addDays(d, 1)) {
      const r = byDate.get(d);
      let value = 0;
      if (r) {
        value =
          r.availableMinutes !== null && !mine
            ? r.availableMinutes > 0
              ? r.occupiedMinutes / r.availableMinutes
              : 0
            : r.occupiedMinutes / best;
      }
      days.push({ date: d, value: Math.max(0, Math.min(1, value)) });
    }
    const label = mine ? "Moje dni" : "Obłożenie w kolejnych dniach";
    return (
      <PulpitChartCard
        cardId={mine ? "moje-dni" : "rytm"}
        title={title}
        hint={hint}
        defaultView={viewFor(ctx.parsed.state, mine ? "moje-dni" : "rytm")}
        chart={
          <div className={scroll}>
            <DotCalendar days={days} label={label} />
          </div>
        }
        table={<DotCalendar days={days} label={label} asTable />}
      />
    );
  });
}

// ---------------------------------------------------------------- godziny per fotel

export function ChairsCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.chairs, ctx.href, async () => {
    const rows = await ctx.run((tx) => queryHoursByChair(tx, ctx.actor, ctx.parsed.metric));
    if (rows.length === 0) return <EmptyCard title={L.cards.chairs} hint={L.cards.chairsHint} />;
    const multi = new Set(rows.map((r) => r.locationId)).size > 1;
    const items = rows.map((r) => {
      const number = ctx.locations.find((l) => l.id === r.locationId)?.number;
      return {
        label: multi && number ? `${number} · ${r.chairName}` : r.chairName,
        value: hoursFromMinutes(r.minutes),
      };
    });
    return (
      <PulpitChartCard
        cardId="fotele"
        title={L.cards.chairs}
        hint={L.cards.chairsHint}
        defaultView={viewFor(ctx.parsed.state, "fotele")}
        chart={
          <div className={scroll}>
            <BarList items={items} label="Godziny per fotel" />
          </div>
        }
        table={<BarList items={items} label="Godziny per fotel" asTable />}
      />
    );
  });
}

// ---------------------------------------------------------------- jakość danych

const QUALITY_LIST = 12;

export function QualityCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.quality, ctx.href, async () => {
    const { days, total } = await ctx.run((tx) => listUnclosedDays(tx, ctx.actor, ctx.parsed.metric));
    return (
      <Card>
        <CardHeader title={L.cards.quality} hint={L.cards.qualityHint} />
        {days.length === 0 ? (
          <p className="text-[var(--text-secondary)]">{L.cards.qualityNone}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {days.slice(0, QUALITY_LIST).map((d) => {
                const loc = ctx.locations.find((l) => l.id === d.locationId);
                return (
                  <li key={`${d.locationId}:${d.dateKey}`}>
                    <Link
                      href={`/oblozenie?${new URLSearchParams({ ...(loc ? { gabinet: loc.number } : {}), dzien: d.dateKey }).toString()}`}
                      className="inline-flex items-center gap-2 text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: colorOf(ctx.locations, d.locationId) }} />
                      <span className="tabular-nums">{longDatePl(d.dateKey)}</span>
                      <span className="text-[var(--text-muted)]">{loc ? `${loc.number} ${loc.name}` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {total > QUALITY_LIST ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                <Link
                  href={drilldownHref("days_closed_rate", ctx.parsed.state, { tab: "niezamkniete" })}
                  className="underline-offset-2 hover:underline"
                >
                  {L.cards.qualityMore.replace("{n}", String(total - QUALITY_LIST))}
                </Link>
              </p>
            ) : null}
          </>
        )}
      </Card>
    );
  });
}

// ---------------------------------------------------------------- wykonawcy (gabinet)

export function ProvidersCard({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  return guarded(L.cards.providers, ctx.href, async () => {
    const rows = await ctx.run((tx) => queryProviderBreakdown(tx, ctx.actor, ctx.parsed.metric));
    if (rows.length === 0) return <EmptyCard title={L.cards.providers} hint={L.cards.providersHint} />;
    return (
      <Card>
        <CardHeader title={L.cards.providers} hint={L.cards.providersHint} />
        <TableView
          caption={L.cards.providers}
          columns={[L.table.provider, L.table.hours, L.table.amount, L.table.perHour]}
          rows={rows.map((r) => {
            const h = hoursFromMinutes(r.minutes);
            return [
              <Link
                key={r.providerKey}
                href={drilldownHref("provider_hours_worked", { ...ctx.parsed.state, wykonawca: r.providerKey })}
                className="underline-offset-2 hover:underline"
              >
                {r.displayName}
              </Link>,
              formatNumber(h, "dec1"),
              formatNumber(zlote(r.amountGrosze), "pln"),
              h > 0 ? `${formatNumber(zlote(r.amountGrosze) / h, "pln")}/h` : "\u2014",
            ];
          })}
        />
      </Card>
    );
  });
}

// ---------------------------------------------------------------- stopka

export async function RefreshFooter({ ctx }: { ctx: DashboardContext }): Promise<ReactNode> {
  try {
    const at = await ctx.once("refresh", () => ctx.exec((tx) => latestRefreshAt(tx)));
    return (
      <p className="text-xs text-[var(--text-muted)]">
        {at ? (
          <>
            {L.refreshedAt}: <span className="tabular-nums">{formatDateTimePl(at)}</span>
          </>
        ) : (
          L.noRefresh
        )}
      </p>
    );
  } catch {
    return <p className="text-xs text-[var(--text-muted)]">{L.noRefresh}</p>;
  }
}
