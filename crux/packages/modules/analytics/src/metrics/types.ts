import type { SQL } from "drizzle-orm";

/** Zakres odczytu wynikający z najwyższego uprawnienia aktora (self < location < network). */
export type MetricScope = "self" | "location" | "network";

export type MetricPermission =
  | "analytics.view_self"
  | "analytics.view_location"
  | "analytics.view_network";

/** Filtry wejściowe (kontrakt `docs/11` §3, po stronie serwera: daty ISO `YYYY-MM-DD`). */
export type MetricFilters = {
  readonly from: string;
  readonly to: string;
  readonly locationIds?: readonly string[];
  readonly providerIds?: readonly string[];
  readonly categories?: readonly string[];
};

/** Filtry po przycięciu do zakresu aktora (puste listy = „wszystkie w widoku”). */
export type ClampedFilters = {
  readonly from: string;
  readonly to: string;
  readonly locationIds: readonly string[];
  readonly providerIds: readonly string[];
  readonly categories: readonly string[];
};

export type MetricParams = ClampedFilters & {
  readonly tenantId: string;
  readonly scope: MetricScope;
};

export type MetricValue = number | null | Readonly<Record<string, number>>;

export type MetricUnit =
  | "ratio"
  | "hours"
  | "grosze"
  | "grosze_per_hour"
  | "grosze_by_category"
  | "hours_by_provider";

export type MetricForma =
  | "kafel"
  | "luk"
  | "siatka"
  | "kropkowy"
  | "kalendarz"
  | "pasek"
  | "linia"
  | "slupki"
  | "lejek"
  | "tabela";

export type MetricDirection = "up" | "down" | "neutral";

export type MetricRow = Record<string, unknown>;

export type MetricDefinition = {
  readonly id: string;
  readonly name: string;
  readonly definition: string;
  readonly since: "1.0";
  readonly direction: MetricDirection;
  readonly goodDirection: MetricDirection;
  readonly forma: readonly MetricForma[];
  readonly grain: readonly string[];
  readonly permission: MetricPermission;
  readonly unit: MetricUnit;
  /** Parametryzowany SQL — czyta WYŁĄCZNIE `analytics.*` (widoki per rola). */
  readonly sql: (params: MetricParams) => SQL;
  /** Wiersze z `sql` → wartość metryki. */
  readonly map: (rows: readonly MetricRow[]) => MetricValue;
  readonly drilldown: {
    readonly entity: "oblozenie";
    readonly filters: readonly string[];
  };
};

export type MetricResult = {
  readonly id: string;
  readonly value: MetricValue;
  readonly unit: MetricUnit;
  readonly refreshedAt: string | null;
  readonly drilldown: {
    readonly entity: "oblozenie";
    readonly metric: string;
    readonly filters: ClampedFilters;
  };
};
