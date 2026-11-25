# @crux/analytics

Analityka wydania 1.0 (F0-011, K13): schemat `analytics` (gwiazda), zasilanie z danych operacyjnych
i rejestr metryk. Specyfikacja: `docs/03a` §12.1, `docs/11` §4.7, reguła `.cursor/rules/70-analytics.mdc`.

## Schemat (`supabase/migrations/0013_analytics.sql`)

- Wymiary: `dim_date` (2020–2040, święta PL z `analytics.is_pl_holiday`), `dim_location`, `dim_chair`,
  `dim_provider` (tylko `display_name`, `title`, `role`), `dim_category` (Z1…Z+).
- Fakty: `fact_chair_capacity` (fotel × dzień), `fact_chair_occupancy` (fotel × dzień × wykonawca ×
  kategoria × źródło; wpis bez wykonawcy → `provider_key = 00000000-0000-7000-8000-000000000000`),
  `fact_day_closures`, `refresh_log`.
- Widoki `security_invoker`: `v_self_occupancy`, `v_location_{occupancy,capacity,day_closures}`,
  `v_network_{occupancy,capacity,day_closures}`. RLS: `tenant_location` + poziom uprawnień
  `analytics.view_self` < `view_location` < `view_network` (wykonawca widzi tylko własne wiersze).
- Dzień lokalny = Europe/Warsaw; wpis należy do dnia początku swojego przedziału.

## Zasilanie

`refreshAnalytics(tx, { mode, tenantId?, locationId?, from, to })` — tylko w
`db.withWorker('analytics.refresh', …)`. Usuwa i zapisuje od nowa fakty w oknie (idempotentne),
loguje okno i liczbę wierszy w `refresh_log`. Worker: przyrost co 5 min (dzień z payloadu zdarzenia albo
ostatnie 48 h), pełne 02:10 (13 miesięcy).

Po `pnpm seed:demo` (okres golden jest stały, więc podaj okno jawnie):

```
pnpm analytics:refresh -- --from 2025-10-01 --to 2026-10-31
```

## Metryki

`metricRegistry` (`src/metrics/<id>.ts`): `chair_utilization`, `chair_hours_worked`, `revenue_realized`,
`revenue_per_chair_hour`, `revenue_by_category`, `provider_hours_worked`, `days_closed_rate`.
`runMetric(tx, actor, id, filters)` — autoryzacja, przycięcie filtrów po stronie serwera (lekarz →
wykonawca = ja; kierownik → tylko swoje gabinety), cache 60 s per użytkownik, SQL wyłącznie na
widokach `analytics.*`. `drilldownOccupancy` / `drilldownCapacity` zwracają wiersze, których suma
równa się wartości metryki (`[F0-011/AC4]`).
