import { listDashboardProviders } from "@crux/analytics";
import { PULPIT_LABELS as L } from "@crux/i18n";
import { Card } from "@crux/ui";
import { Suspense, type ReactNode } from "react";
import type { DashboardContext } from "../context";
import { filtersToSearchParams } from "../filters";
import { CardSkeleton } from "./card-frame";
import {
  CategoriesCard,
  ChairsCard,
  CompareCard,
  GaugesCard,
  ProvidersCard,
  QualityCard,
  RefreshFooter,
  RevenueWeeklyCard,
  RhythmCard,
} from "./chart-cards";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { KpiTileCard, type TileMetric } from "./kpi-cards";

/** Klucz Suspense: zmiana filtrów remontuje karty i pokazuje przyciemniony szkielet. */
function filterKey(ctx: DashboardContext): string {
  return filtersToSearchParams(ctx.parsed.state, { includeWidok: false }).toString() || "domyslne";
}

function Tile({ ctx, id, label, extra, drill }: { ctx: DashboardContext; id: TileMetric; label?: string; extra?: boolean; drill?: boolean }) {
  return (
    <div className={extra ? "hidden min-[1440px]:block" : undefined}>
      <Suspense key={`${filterKey(ctx)}:${id}`} fallback={<CardSkeleton tile {...(label ? { title: label } : {})} />}>
        <KpiTileCard
          ctx={ctx}
          id={id}
          {...(label ? { label } : {})}
          {...(drill ? { drillState: { ...ctx.parsed.state, wykonawca: ctx.actor.staffId } } : {})}
        />
      </Suspense>
    </div>
  );
}

function Cell({ ctx, id, title, className, children }: { ctx: DashboardContext; id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <Suspense key={`${filterKey(ctx)}:${id}`} fallback={<CardSkeleton title={title} />}>
        {children}
      </Suspense>
    </div>
  );
}

async function loadProviders(ctx: DashboardContext) {
  try {
    return await ctx.run((tx) => listDashboardProviders(tx, ctx.actor, ctx.parsed.metric));
  } catch {
    return [];
  }
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{title}</h1>
      {subtitle ? <p className="mt-1 text-[var(--text-secondary)]">{subtitle}</p> : null}
    </header>
  );
}

export function Forbidden() {
  return (
    <div>
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{L.title}</h1>
      <p role="alert" className="mt-4 text-[var(--text-secondary)]">
        {L.forbidden}
      </p>
    </div>
  );
}

/** Pulpit sieci (`/pulpit`) i gabinetu (`/pulpit/gabinet`): te same karty, inny zakres. */
export async function NetworkOrLocationDashboard({ ctx }: { ctx: DashboardContext }) {
  const location = ctx.page === "location";
  const providers = await loadProviders(ctx);
  const chosen = ctx.parsed.metric.locationIds?.[0];
  const loc = ctx.locations.find((l) => l.id === chosen);
  return (
    <div className="flex flex-col gap-6">
      <Heading
        title={location ? L.titleGabinet : L.title}
        {...(location && loc ? { subtitle: `${loc.number} ${loc.name}` } : {})}
      />
      <DashboardFilterBar
        state={ctx.parsed.state}
        period={ctx.parsed.period}
        locations={ctx.locations}
        providers={providers}
        singleLocation={location}
      />
      <section aria-label="Kafle" className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Tile ctx={ctx} id="chair_utilization" />
        <Tile ctx={ctx} id="chair_hours_worked" />
        <Tile ctx={ctx} id="revenue_realized" />
        <Tile ctx={ctx} id="revenue_per_chair_hour" />
        <Tile ctx={ctx} id="days_closed_rate" extra />
        <Tile ctx={ctx} id="provider_hours_worked" extra />
      </section>
      <Cell ctx={ctx} id="przychod" title={L.cards.revenueWeekly}>
        <RevenueWeeklyCard ctx={ctx} />
      </Cell>
      <div className="grid gap-4 xl:grid-cols-2">
        <Cell ctx={ctx} id="luki" title={L.cards.gauges}>
          <GaugesCard ctx={ctx} />
        </Cell>
        <Cell ctx={ctx} id="porownanie" title={L.cards.compare}>
          <CompareCard ctx={ctx} />
        </Cell>
        <Cell ctx={ctx} id="kategorie" title={L.cards.categories}>
          <CategoriesCard ctx={ctx} />
        </Cell>
        <Cell ctx={ctx} id="rytm" title={L.cards.rhythm}>
          <RhythmCard ctx={ctx} />
        </Cell>
        <Cell ctx={ctx} id="fotele" title={L.cards.chairs}>
          <ChairsCard ctx={ctx} />
        </Cell>
        <Cell ctx={ctx} id="jakosc" title={L.cards.quality}>
          <QualityCard ctx={ctx} />
        </Cell>
        {location ? (
          <Cell ctx={ctx} id="wykonawcy" title={L.cards.providers} className="xl:col-span-2">
            <ProvidersCard ctx={ctx} />
          </Cell>
        ) : null}
      </div>
      <Suspense fallback={null}>
        <RefreshFooter ctx={ctx} />
      </Suspense>
    </div>
  );
}

/** Pulpit „moje” (`/pulpit/moje`): własne godziny, kwoty i dni. */
export function MineDashboard({ ctx }: { ctx: DashboardContext }) {
  return (
    <div className="flex flex-col gap-6">
      <Heading title={L.titleMoje} />
      <DashboardFilterBar state={ctx.parsed.state} period={ctx.parsed.period} locations={[]} hideScope />
      <section aria-label="Kafle" className="grid gap-4 sm:grid-cols-3">
        <Tile ctx={ctx} id="chair_hours_worked" label={L.moje.hours} drill />
        <Tile ctx={ctx} id="revenue_realized" label={L.moje.revenue} drill />
        <Tile ctx={ctx} id="revenue_per_chair_hour" label={L.moje.perHour} drill />
      </section>
      <Card>
        <h2 className="text-base font-bold">{L.moje.median}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{L.moje.medianUnavailable}</p>
      </Card>
      <Cell ctx={ctx} id="moje-dni" title={L.cards.mineRhythm}>
        <RhythmCard ctx={ctx} mine />
      </Cell>
      <Suspense fallback={null}>
        <RefreshFooter ctx={ctx} />
      </Suspense>
    </div>
  );
}
