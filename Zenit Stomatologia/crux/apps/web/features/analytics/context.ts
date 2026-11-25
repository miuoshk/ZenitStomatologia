import { listDashboardLocations, type DashboardLocation } from "@crux/analytics";
import type { Actor, Tx } from "@crux/db";
import type { DomainError, Result } from "@crux/shared/result";
import { systemClock, toLocalDay } from "@crux/shared/time";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";
import { dashboardAccess, type DashboardPage } from "./access";
import { CardError } from "./errors";
import {
  filtersToSearchParams,
  parseDashboardFilters,
  withQuery,
  type ParsedDashboardFilters,
  type RawSearchParams,
} from "./filters";

export type DashboardContext = {
  readonly actor: Actor;
  readonly page: DashboardPage;
  readonly path: string;
  /** Bieżący URL (z filtrami) — „Spróbuj ponownie” i linki zwrotne. */
  readonly href: string;
  readonly today: string;
  readonly locations: readonly DashboardLocation[];
  readonly parsed: ParsedDashboardFilters;
  /** Wykonuje zapytanie w `withActor`; `Result` z błędem → `CardError`. */
  run<T>(fn: (tx: Tx) => Promise<Result<T, DomainError>>): Promise<T>;
  /** Jak `run`, dla zapytań zwracających wartość bezpośrednio (bez `Result`). */
  exec<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Dedupe zapytań w obrębie jednego żądania (np. dane wspólne dla kilku kart). */
  once<T>(key: string, fn: () => Promise<T>): Promise<T>;
};

function rawQuery(searchParams: RawSearchParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined) q.set(k, val);
  }
  return q.toString();
}

export type ListContext = DashboardContext & { readonly canExport: boolean };

/**
 * Start listy drążenia (`/lista/oblozenie`): bez przekierowań ról, zakres wynika z uprawnień
 * (zakres `self` → wykonawca = ja). Zwraca null przy braku uprawnień analytics.
 */
export async function loadListContext(
  path: string,
  searchParams: RawSearchParams,
): Promise<ListContext | null> {
  const actor = await requireActor();
  const has = (p: string) => actor.permissions.includes(p);
  const network = has("analytics.view_network");
  const location = has("analytics.view_location");
  if (!network && !location && !has("analytics.view_self")) return null;
  const page: DashboardPage = network || location ? "network" : "self";
  const base = await buildContext(actor, page, path, searchParams);
  return { ...base, canExport: has("analytics.export") };
}

/**
 * Wspólny start pulpitów: aktor → dostęp/przekierowanie (AC3) → gabinety → filtry z URL.
 * Zwraca null przy braku uprawnień do jakiegokolwiek pulpitu.
 */
export async function loadDashboardContext(
  page: DashboardPage,
  path: string,
  searchParams: RawSearchParams,
): Promise<DashboardContext | null> {
  const actor = await requireActor();
  const access = dashboardAccess(actor.permissions, page);
  if (access.kind === "redirect") {
    const q = rawQuery(searchParams);
    redirect(q ? `${access.to}?${q}` : access.to);
  }
  if (access.kind === "forbidden") return null;

  return buildContext(actor, page, path, searchParams);
}

async function buildContext(
  actor: Actor,
  page: DashboardPage,
  path: string,
  searchParams: RawSearchParams,
): Promise<DashboardContext> {
  const db = getDb();
  const locations = await db.withActor(actor, (tx) => listDashboardLocations(tx, actor));
  const today = toLocalDay(systemClock.now());
  const parsed = parseDashboardFilters(searchParams, actor, locations, { today, mode: page });
  const href = withQuery(path, filtersToSearchParams(parsed.state));
  const memo = new Map<string, Promise<unknown>>();

  return {
    actor,
    page,
    path,
    href,
    today,
    locations,
    parsed,
    async run(fn) {
      const result = await db.withActor(actor, (tx) => fn(tx));
      if (!result.ok) {
        throw new CardError(result.error.type === "forbidden" ? "forbidden" : "failed");
      }
      return result.value;
    },
    exec(fn) {
      return db.withActor(actor, (tx) => fn(tx));
    },
    once(key, fn) {
      const hit = memo.get(key);
      if (hit) return hit as Promise<never>;
      const p = fn();
      memo.set(key, p);
      return p;
    },
  };
}
