import { metricRegistry } from "@crux/analytics";
import { PULPIT_LABELS as L, SOURCE_LABELS_PL } from "@crux/i18n";
import { Card, formatNumber } from "@crux/ui";
import Link from "next/link";
import {
  CapacityTable,
  OccupancyTable,
  UnclosedTable,
  type DrilldownLabels,
} from "@/features/analytics/components/drilldown-table";
import { Forbidden, Heading } from "@/features/analytics/components/pulpit-views";
import { loadListContext } from "@/features/analytics/context";
import { loadDrillData, parseMetricId, type ControlSum, type ListTab } from "@/features/analytics/drilldown";
import { longDatePl } from "@/features/analytics/dates";
import { filtersToSearchParams, withQuery, type RawSearchParams } from "@/features/analytics/filters";
import { CardError } from "@/features/analytics/errors";

type Props = { searchParams: Promise<RawSearchParams> };

const MAX_ROWS = 500;
const TAB_LABELS: Record<ListTab, string> = {
  licznik: L.drill.tabs.numerator,
  mianownik: L.drill.tabs.denominator,
  niezamkniete: L.drill.tabs.unclosed,
};

function one(raw: RawSearchParams, key: string): string | undefined {
  const v = raw[key];
  return Array.isArray(v) ? v[0] : v;
}

function formatControl(kind: ControlSum["kind"], v: number | null): string {
  if (v === null) return "\u2014";
  switch (kind) {
    case "pct":
      return formatNumber(v, "pct");
    case "hours":
      return `${formatNumber(v, "dec1")} h`;
    case "grosze":
      return formatNumber(v / 100, "pln");
    case "grosze_per_hour":
      return `${formatNumber(v / 100, "pln")}/h`;
    default:
      return formatNumber(v);
  }
}

const labels = (caption: string): DrilldownLabels => ({
  ...L.drill.columns,
  empty: L.empty,
  caption,
});

/** Lista drążenia: wpisy w liczniku / pojemność w mianowniku + suma kontrolna równa kaflowi (F0-011/AC4). */
export default async function ListaOblozeniePage({ searchParams }: Props) {
  const raw = await searchParams;
  const ctx = await loadListContext("/lista/oblozenie", raw);
  if (!ctx) return <Forbidden />;

  const metric = parseMetricId(one(raw, "metric"));
  if (!metric) {
    return (
      <div>
        <Heading title={L.drill.title} />
        <p role="alert" className="mt-4 text-[var(--text-secondary)]">
          {L.drill.unknownMetric}
        </p>
      </div>
    );
  }

  let data;
  try {
    data = await loadDrillData(ctx, metric, one(raw, "tab"));
  } catch (e) {
    return (
      <div>
        <Heading title={L.drill.title} />
        <p role="alert" className="mt-4 text-[var(--text-secondary)]">
          {e instanceof CardError && e.kind === "forbidden" ? L.forbidden : L.error}
        </p>
      </div>
    );
  }

  const state = ctx.parsed.state;
  const filterQuery = filtersToSearchParams(state, { includeWidok: false });
  const tabHref = (tab: ListTab) =>
    withQuery("/lista/oblozenie", new URLSearchParams([["metric", metric], ...filterQuery.entries()]), { tab });
  const exportHref = withQuery(
    "/lista/oblozenie/export",
    new URLSearchParams([["metric", metric], ...filterQuery.entries()]),
    { tab: data.tab },
  );
  const backBase = ctx.actor.permissions.includes("analytics.view_network")
    ? "/pulpit"
    : ctx.actor.permissions.includes("analytics.view_location")
      ? "/pulpit/gabinet"
      : "/pulpit/moje";
  const backHref = withQuery(backBase, filterQuery);

  const locNumber = (id: string) => ctx.locations.find((l) => l.id === id)?.number ?? "";
  const chairName = (id: string) => data.names.chairs.get(id) ?? "Fotel";
  const { from, to } = ctx.parsed.period;
  const name = metricRegistry[metric].name;
  const caption = `${name}: ${TAB_LABELS[data.tab]}`;

  const occupancyRows = data.occupancy.slice(0, MAX_ROWS).map((r, i) => ({
    id: String(i),
    date: longDatePl(r.dateKey),
    location: locNumber(r.locationId),
    chair: chairName(r.chairKey),
    provider: data.names.providers.get(r.providerKey) ?? "\u2014",
    category: r.categoryKey,
    source: SOURCE_LABELS_PL[r.source] ?? r.source,
    minutes: r.occupiedMinutes,
    amountGrosze: r.amountGrosze,
    entries: r.entries,
  }));
  const capacityRows = data.capacity.slice(0, MAX_ROWS).map((r, i) => ({
    id: String(i),
    date: longDatePl(r.dateKey),
    location: locNumber(r.locationId),
    chair: chairName(r.chairKey),
    open: r.openMinutes,
    blocked: r.blockedMinutes,
    available: r.availableMinutes,
  }));
  const unclosedRows = data.unclosed.map((d, i) => ({
    id: String(i),
    date: longDatePl(d.dateKey),
    location: ctx.locations.find((l) => l.id === d.locationId)?.name ?? "",
  }));
  const total =
    data.tab === "licznik" ? data.occupancy.length : data.tab === "mianownik" ? data.capacity.length : data.unclosed.length;
  const shown = Math.min(total, MAX_ROWS);

  return (
    <div className="flex flex-col gap-6">
      <Heading
        title={L.drill.title}
        subtitle={`${name} · ${longDatePl(from)} – ${longDatePl(to)}`}
      />
      <p>
        <Link
          href={backHref}
          className="text-sm font-semibold text-[var(--text-secondary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          ← {L.drill.back}
        </Link>
      </p>

      <Card aria-label={L.drill.controlSum} data-testid="control-sum">
        <h2 className="text-base font-bold">{L.drill.controlSum}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-[var(--text-muted)]">{L.drill.tile}</dt>
            <dd className="text-2xl font-extrabold tabular-nums" data-testid="control-tile">
              {formatControl(data.control.kind, data.control.tile)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">{L.drill.list}</dt>
            <dd className="text-2xl font-extrabold tabular-nums" data-testid="control-list">
              {formatControl(data.control.kind, data.control.list)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">{L.drill.hours}</dt>
            <dd className="text-lg font-bold tabular-nums">{formatNumber(data.totals.hours, "dec1")} h</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">{L.drill.amount}</dt>
            <dd className="text-lg font-bold tabular-nums">{formatNumber(data.totals.amountGrosze / 100, "pln")}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status">
          {data.control.match ? `✓ ${L.drill.match}` : `⚠ ${L.drill.mismatch}`}
          {data.totals.availableHours !== null
            ? ` · ${L.drill.available}: ${formatNumber(data.totals.availableHours, "dec1")} h`
            : ""}
        </p>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {data.tabs.length > 1 ? (
            <nav aria-label="Zakładki listy" className="inline-flex rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-1">
              {data.tabs.map((t) => (
                <Link
                  key={t}
                  href={tabHref(t)}
                  aria-current={t === data.tab ? "page" : undefined}
                  className={`min-h-9 rounded-[var(--radius-pole)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
                    t === data.tab
                      ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {TAB_LABELS[t]}
                </Link>
              ))}
            </nav>
          ) : (
            <h2 className="text-base font-bold">{TAB_LABELS[data.tab]}</h2>
          )}
          {ctx.canExport ? (
            <a
              href={exportHref}
              download
              className="inline-flex min-h-9 items-center rounded-[var(--radius-pelne)] border border-[var(--border)] px-3.5 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {L.drill.csv}
            </a>
          ) : null}
        </div>
        {data.tab === "licznik" ? <OccupancyTable rows={occupancyRows} labels={labels(caption)} /> : null}
        {data.tab === "mianownik" ? <CapacityTable rows={capacityRows} labels={labels(caption)} /> : null}
        {data.tab === "niezamkniete" ? <UnclosedTable rows={unclosedRows} labels={labels(caption)} /> : null}
        {total > shown ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {L.drill.truncated.replace("{shown}", String(shown)).replace("{total}", String(total))}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
