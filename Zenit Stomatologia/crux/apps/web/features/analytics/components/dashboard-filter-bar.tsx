"use client";

import { PULPIT_LABELS as L } from "@crux/i18n";
import { FilterBar, Input, Select } from "@crux/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import {
  FILTER_PARAM_KEYS,
  OKRESY,
  POROWNANIA,
  filtersToSearchParams,
  withQuery,
  type DashboardFilterState,
  type Okres,
  type Porownanie,
} from "../filters";

export const FILTERS_STORAGE_KEY = "crux.pulpit.filters";

const CATEGORIES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"] as const;

type Props = {
  state: DashboardFilterState;
  /** Aktualnie rozwiązany okres — start dla „własnego zakresu”. */
  period: { from: string; to: string };
  locations: readonly { number: string; name: string }[];
  providers?: readonly { id: string; displayName: string }[];
  /** Pulpit gabinetu: jeden gabinet, bez opcji „wszystkie”. */
  singleLocation?: boolean;
  /** Pulpit „moje”: bez filtra gabinetu i wykonawcy. */
  hideScope?: boolean;
};

/** Pasek filtrów pulpitu: zapis w URL (link do wysłania) i ostatnio użyte w `localStorage`. */
export function DashboardFilterBar({ state, period: current, locations, providers = [], singleLocation = false, hideScope = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Przywrócenie ostatnich filtrów, gdy URL ich nie zawiera.
  useEffect(() => {
    const hasFilters = FILTER_PARAM_KEYS.some((k) => search.has(k));
    if (hasFilters) return;
    try {
      const saved = window.localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!saved) return;
      const q = new URLSearchParams(saved);
      if (!FILTER_PARAM_KEYS.some((k) => q.has(k))) return;
      const widok = search.get("widok");
      if (widok) q.set("widok", widok);
      startTransition(() => {
        router.replace(withQuery(pathname, q));
      });
    } catch {
      // brak dostępu do localStorage — pomijamy
    }
    // tylko przy pierwszym wejściu
  }, []);

  function apply(patch: Partial<DashboardFilterState>) {
    const next: DashboardFilterState = { ...state, ...patch };
    const q = filtersToSearchParams(next, { includeWidok: false });
    try {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, q.toString());
    } catch {
      // ignorujemy
    }
    const widok = filtersToSearchParams(next).get("widok");
    if (widok) q.set("widok", widok);
    startTransition(() => {
      router.push(withQuery(pathname, q));
    });
  }

  const period = (v: string): Partial<DashboardFilterState> => {
    const okres = v as Okres;
    if (okres !== "od") return { okres, od: null, do: null };
    return { okres, od: state.od ?? current.from, do: state.do ?? current.to };
  };

  const gabinetValue = state.gabinet.length === 1 ? (state.gabinet[0] ?? "all") : singleLocation ? (locations[0]?.number ?? "") : "all";

  return (
    <FilterBar {...(pending ? { className: "opacity-70" } : {})}>
      <Select
        label={L.filters.period}
        value={state.okres}
        onChange={(e) => {
          apply(period(e.target.value));
        }}
        options={OKRESY.map((o) => ({ value: o, label: L.filters.periods[o] }))}
      />
      {state.okres === "od" ? (
        <>
          <Input
            type="date"
            label={L.filters.from}
            value={state.od ?? ""}
            onChange={(e) => {
              if (e.target.value) apply({ od: e.target.value });
            }}
          />
          <Input
            type="date"
            label={L.filters.to}
            value={state.do ?? ""}
            onChange={(e) => {
              if (e.target.value) apply({ do: e.target.value });
            }}
          />
        </>
      ) : null}
      <Select
        label={L.filters.compare}
        value={state.porownaj}
        onChange={(e) => {
          apply({ porownaj: e.target.value as Porownanie });
        }}
        options={POROWNANIA.map((o) => ({ value: o, label: L.filters.compares[o] }))}
      />
      {hideScope ? null : (
        <Select
          label={L.filters.location}
          value={gabinetValue}
          onChange={(e) => {
            apply({ gabinet: e.target.value === "all" ? [] : [e.target.value] });
          }}
          options={[
            ...(singleLocation ? [] : [{ value: "all", label: L.filters.all }]),
            ...locations.map((l) => ({ value: l.number, label: `${l.number} ${l.name}` })),
          ]}
        />
      )}
      {hideScope ? null : (
        <Select
          label={L.filters.provider}
          value={state.wykonawca ?? "all"}
          onChange={(e) => {
            apply({ wykonawca: e.target.value === "all" ? null : e.target.value });
          }}
          options={[
            { value: "all", label: L.filters.allProviders },
            ...providers.map((p) => ({ value: p.id, label: p.displayName })),
          ]}
        />
      )}
      <Select
        label={L.filters.category}
        value={state.kategoria.length === 1 ? (state.kategoria[0] ?? "all") : "all"}
        onChange={(e) => {
          apply({ kategoria: e.target.value === "all" ? [] : [e.target.value] });
        }}
        options={[
          { value: "all", label: L.filters.all },
          ...CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
      />
    </FilterBar>
  );
}
