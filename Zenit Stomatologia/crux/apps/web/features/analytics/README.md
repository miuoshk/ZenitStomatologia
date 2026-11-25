# Pulpity 1.0 (F0-011, K14)

Trasy: `/pulpit` (sieć), `/pulpit/gabinet`, `/pulpit/moje`, `/lista/oblozenie?metric=<id>&…` (+ `/lista/oblozenie/export` = CSV).

- Filtry URL (`docs/11` §3): `filters.ts` (`parseDashboardFilters`, `filtersToSearchParams`, `drilldownHref`); ostatnie filtry w
  `localStorage` pod kluczem `crux.pulpit.filters` (`components/dashboard-filter-bar.tsx`).
- Dostęp i przekierowania ról (AC3): `access.ts`; filtry przycina serwer (`runMetric` + `parseDashboardFilters`).
- Dane: wyłącznie `@crux/analytics` (metryki, `query*` z `queries/dashboard.ts`, drążenie); web nie agreguje `scheduling.*`.
- Karty to RSC owinięte w `Suspense` (szkielet z `opacity-50`) i `guarded` (karta błędu + „Spróbuj ponownie”).
- Widok „Wykres | Tabela” per karta: parametr `widok=<karta>:tabela` (zapis przez `history.replaceState`).
- CSV: wymaga `analytics.export`; zapis śladu jako zdarzenie outboxa `analytics.export_generated.v1` (bez treści wierszy).

## Jak otworzyć na danych wzorcowych

```
pnpm seed:demo && pnpm analytics:refresh -- --from 2025-10-01 --to 2026-10-31
pnpm --filter @crux/web dev
# zaloguj się kontem zarządu, potem:
/pulpit?okres=od&od=2025-10-01&do=2026-10-31&gabinet=all
```

## Zrzuty ekranu w PR

Do PR dołącz zrzuty `/pulpit`, `/pulpit/gabinet`, `/pulpit/moje` i `/lista/oblozenie` w **obu motywach**
(jasnym i ciemnym, `data-theme="dark"`) wg listy kontrolnej `docs/14`, sekcja 11.
