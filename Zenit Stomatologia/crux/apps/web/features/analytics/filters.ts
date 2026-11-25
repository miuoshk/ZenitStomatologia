import type { Actor } from "@crux/db";
import type { MetricFilters } from "@crux/analytics";
import { PlainDateSchema, type PlainDate } from "@crux/shared/time";
import {
  addDays,
  dayCount,
  minusOneYear,
  startOfIsoWeek,
  startOfMonth,
  startOfYear,
} from "./dates";

/** Kontrakt filtrów URL (`docs/11` §3). */
export const OKRESY = ["dzis", "7d", "30d", "mtd", "kw", "rok", "od"] as const;
export type Okres = (typeof OKRESY)[number];

export const POROWNANIA = ["poprzedni", "rok_temu", "cel", "mediana_sieci", "brak"] as const;
export type Porownanie = (typeof POROWNANIA)[number];

export const DEFAULT_OKRES: Okres = "30d";
export const DEFAULT_POROWNAJ: Porownanie = "poprzedni";

export type WidokKarty = "wykres" | "tabela";

export type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

/** Stan filtrów w kształcie URL (przed rozwiązaniem na daty i identyfikatory). */
export type DashboardFilterState = {
  readonly okres: Okres;
  readonly od: string | null;
  readonly do: string | null;
  readonly porownaj: Porownanie;
  /** Numery gabinetów (`01`, `02`); pusta lista = „all”. */
  readonly gabinet: readonly string[];
  /** Identyfikator wykonawcy albo null = „all”. */
  readonly wykonawca: string | null;
  readonly kategoria: readonly string[];
  /** `*` = wszystkie karty; w przeciwnym razie id karty → widok. */
  readonly widok: Readonly<Record<string, WidokKarty>>;
};

const CATEGORY_RE = /^Z(?:[1-5]|\+)$/;
const NUMBER_RE = /^\d{1,3}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(raw: RawSearchParams, key: string): string | undefined {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined ? undefined : s;
}

function list(value: string | undefined): string[] {
  return value
    ? [...new Set(value.split(",").map((s) => s.trim()).filter((s) => s.length > 0))]
    : [];
}

function validDate(value: string | undefined): string | null {
  if (!value) return null;
  return PlainDateSchema.safeParse(value).success ? value : null;
}

function parseWidok(value: string | undefined): Record<string, WidokKarty> {
  const out: Record<string, WidokKarty> = {};
  for (const part of list(value)) {
    const [card, view] = part.includes(":") ? part.split(":") : ["*", part];
    if ((view === "wykres" || view === "tabela") && card) out[card] = view;
  }
  return out;
}

/** Czysty parser `searchParams` → stan filtrów (nieznane wartości wracają do domyślnych). */
export function parseFilterState(raw: RawSearchParams): DashboardFilterState {
  const od = validDate(one(raw, "od"));
  const doo = validDate(one(raw, "do"));
  const okresRaw = one(raw, "okres");
  let okres: Okres = (OKRESY as readonly string[]).includes(okresRaw ?? "")
    ? (okresRaw as Okres)
    : DEFAULT_OKRES;
  if (okresRaw === undefined && od && doo) okres = "od";
  if (okres === "od" && !(od && doo && od <= doo)) okres = DEFAULT_OKRES;

  const porownajRaw = one(raw, "porownaj");
  const porownaj = (POROWNANIA as readonly string[]).includes(porownajRaw ?? "")
    ? (porownajRaw as Porownanie)
    : DEFAULT_POROWNAJ;

  const gabinetRaw = list(one(raw, "gabinet"));
  const gabinet = gabinetRaw.includes("all") ? [] : gabinetRaw.filter((g) => NUMBER_RE.test(g));
  const wykonawcaRaw = one(raw, "wykonawca");
  const wykonawca = wykonawcaRaw && UUID_RE.test(wykonawcaRaw) ? wykonawcaRaw : null;
  const kategoria = list(one(raw, "kategoria")).filter((c) => CATEGORY_RE.test(c));

  return {
    okres,
    od: okres === "od" ? od : null,
    do: okres === "od" ? doo : null,
    porownaj,
    gabinet,
    wykonawca,
    kategoria,
    widok: parseWidok(one(raw, "widok")),
  };
}

/** Okres kalendarzowy do dziś włącznie (`today` = lokalny dzień). */
export function resolvePeriod(
  state: DashboardFilterState,
  today: string,
): { from: PlainDate; to: PlainDate } {
  const to = today as PlainDate;
  switch (state.okres) {
    case "dzis":
      return { from: to, to };
    case "7d":
      return { from: addDays(today, -6), to };
    case "mtd":
      return { from: startOfMonth(today), to };
    case "kw":
      return { from: startOfIsoWeek(today), to };
    case "rok":
      return { from: startOfYear(today), to };
    case "od":
      return { from: (state.od ?? today) as PlainDate, to: (state.do ?? today) as PlainDate };
    default:
      return { from: addDays(today, -29), to };
  }
}

/** Okres porównawczy dla `poprzedni` / `rok_temu`; inne tryby nie mają okresu. */
export function resolveComparePeriod(
  porownaj: Porownanie,
  period: { from: string; to: string },
): { from: PlainDate; to: PlainDate } | null {
  if (porownaj === "poprzedni") {
    const n = dayCount(period.from, period.to);
    return { from: addDays(period.from, -n), to: addDays(period.from, -1) };
  }
  if (porownaj === "rok_temu") {
    return { from: minusOneYear(period.from), to: minusOneYear(period.to) };
  }
  return null;
}

export type DashboardMode = "network" | "location" | "self";

export type LocationRef = { readonly id: string; readonly number: string };

export type ParsedDashboardFilters = {
  readonly state: DashboardFilterState;
  readonly period: { readonly from: PlainDate; readonly to: PlainDate };
  readonly comparePeriod: { readonly from: PlainDate; readonly to: PlainDate } | null;
  /** Gotowe do `runMetric` (serwer i tak przycina do zakresu aktora). */
  readonly metric: MetricFilters;
  readonly compareMetric: MetricFilters | null;
};

/**
 * `searchParams` → stan, daty i `MetricFilters`.
 * - `self`: wykonawca = ja (ignoruje `wykonawca` z URL),
 * - `location`: dokładnie jeden gabinet z członkostwa aktora (żądany, a gdy poza członkostwem: aktywny),
 * - `network`: gabinety z URL (numery → id), reszta jak w URL.
 */
export function parseDashboardFilters(
  searchParams: RawSearchParams,
  actor: Actor,
  locations: readonly LocationRef[],
  options: { today: string; mode?: DashboardMode } = { today: "" },
): ParsedDashboardFilters {
  const mode = options.mode ?? "network";
  const state = parseFilterState(searchParams);
  const period = resolvePeriod(state, options.today);

  const requested = locations
    .filter((l) => state.gabinet.includes(l.number) || state.gabinet.includes(l.number.replace(/^0+/, "")))
    .map((l) => l.id);

  let locationIds: string[];
  if (mode === "location") {
    const unrestricted = actor.permissions.includes("analytics.view_network");
    const allowed = new Set(unrestricted ? locations.map((l) => l.id) : actor.locationIds);
    const pick = requested.find((id) => allowed.has(id));
    const fallback = allowed.has(actor.activeLocationId)
      ? actor.activeLocationId
      : actor.locationIds[0];
    locationIds = pick ? [pick] : fallback ? [fallback] : [];
  } else {
    locationIds = requested;
  }

  const providerIds =
    mode === "self" ? [actor.staffId] : state.wykonawca ? [state.wykonawca] : [];

  const base = {
    locationIds,
    providerIds,
    categories: [...state.kategoria],
  };
  const comparePeriod = resolveComparePeriod(state.porownaj, period);
  return {
    state,
    period,
    comparePeriod,
    metric: { from: period.from, to: period.to, ...base },
    compareMetric: comparePeriod ? { from: comparePeriod.from, to: comparePeriod.to, ...base } : null,
  };
}

/** Zapis stanu filtrów do URL; domyślne wartości są pomijane, by linki były krótkie. */
export function filtersToSearchParams(
  state: DashboardFilterState,
  options: { includeWidok?: boolean; locationNumbers?: readonly string[] } = {},
): URLSearchParams {
  const p = new URLSearchParams();
  if (state.okres !== DEFAULT_OKRES) p.set("okres", state.okres);
  if (state.okres === "od" && state.od && state.do) {
    p.set("od", state.od);
    p.set("do", state.do);
  }
  if (state.porownaj !== DEFAULT_POROWNAJ) p.set("porownaj", state.porownaj);
  const gabinet = options.locationNumbers ?? state.gabinet;
  if (gabinet.length > 0) p.set("gabinet", gabinet.join(","));
  if (state.wykonawca) p.set("wykonawca", state.wykonawca);
  if (state.kategoria.length > 0) p.set("kategoria", state.kategoria.join(","));
  if (options.includeWidok !== false) {
    const widok = Object.entries(state.widok).map(([k, v]) => (k === "*" ? v : `${k}:${v}`));
    if (widok.length > 0) p.set("widok", widok.join(","));
  }
  return p;
}

export function withQuery(path: string, params: URLSearchParams, extra?: Record<string, string>): string {
  const q = new URLSearchParams(params);
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Link drążenia `/lista/oblozenie?metric=<id>&<filtry>` (docs/11 §6). */
export function drilldownHref(metric: string, state: DashboardFilterState, extra?: Record<string, string>): string {
  const q = filtersToSearchParams(state, { includeWidok: false });
  return withQuery("/lista/oblozenie", new URLSearchParams([["metric", metric], ...q.entries()]), extra);
}

export function viewFor(state: DashboardFilterState, cardId: string): WidokKarty {
  return state.widok[cardId] ?? state.widok["*"] ?? "wykres";
}

export const FILTER_PARAM_KEYS = ["okres", "od", "do", "porownaj", "gabinet", "wykonawca", "kategoria"] as const;

/** Ustawia widok jednej karty w query string (np. `window.location.search`) i zwraca nowy query. */
export function setWidokParam(search: string, cardId: string, view: WidokKarty): string {
  const p = new URLSearchParams(search);
  const current = parseWidok(p.get("widok") ?? undefined);
  current[cardId] = view;
  p.set(
    "widok",
    Object.entries(current)
      .map(([k, v]) => (k === "*" ? v : `${k}:${v}`))
      .join(","),
  );
  return p.toString();
}
