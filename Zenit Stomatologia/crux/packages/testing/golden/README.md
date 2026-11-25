# Golden dataset (K12)

Syntetyczny zestaw odniesienia do testów metryk (K13+ — analytics). Dane wyłącznie wymyślone
(imiona z sylab, NPWZ z prefiksem testowym `99`, e-maile `@demo.invalid`).

| Element | Wartość |
|---|---|
| Ziarno | `GOLDEN_SEED = 20261105` (`src/golden/constants.ts`) |
| Okres | `2025-10-01` … `2026-10-31` (13 miesięcy kalendarzowych, stały — bez „dzisiaj”) |
| Tenant | `e73ad5fa-5fc7-5035-86eb-01a1b04172a3` („Zenit Stomatologia DEMO”) |
| Gabinet 01 Nowodworska | `f62b1b4a-f2ce-5201-a62b-782269ed32be`, `color_key = '01'`, 3 fotele |
| Gabinet 02 Białowieska | `4c63ebe5-ac7b-561c-8c69-0b0650de7de0`, `color_key = '02'`, 2 fotele |
| Personel | 5 dentystów (`prov1`–`prov5`; 01: prov1–3, 02: prov4–5), recepcja, kierownik |
| Godziny | pon–pt 8–20, sob 8–14, niedziela zamknięte (od 2025-01-01) |
| Blokady czasu | dokładnie 6 (pon–pt, 2–4 h, fotel, `kind = serwis`) |

Wszystkie UUID struktury są stabilne (SHA-1 z etykiety, `stableUuid`). Wiersze `chair_occupancy`
dostają UUIDv7 z bazy (nie wchodzą do metryk).

## Generowanie

- Rozkład: dla każdego dnia roboczego i gabinetu godzina fotela jest wypełniona z p = 0,80 (01) / 0,65 (02);
  sobota × 0,70. Godziny objęte blokadą nie mają wpisów. Faktyczne wypełnienie podaje `by_location` w `expected.json`.
- Kategoria: wagi Z1 .20 · Z2 .25 · Z3 .28 · Z4 .15 · Z5 .08 · Z+ .04; kwota losowana z zakresu kategorii
  (grosze, krok 100 gr; `src/factories/categories.ts`).
- Wykonawca: dentyści gabinetu tasowani codziennie i przypisywani do foteli (brak podwójnych rezerwacji).
- Zamknięcie dnia: dla ~95 % dni roboczych (gabinet × dzień z godzinami otwarcia).
- Odtworzenie: `pnpm --filter @crux/testing gen:golden` (nadpisuje `expected.json`).
  Test `golden.test.ts` pilnuje, żeby plik był zgodny z generatorem.

## Jak policzono wartości (`expected.json`)

Okno: cały okres, wszystkie gabinety.

- `available_minutes` = Σ po (gabinet, fotel, dzień z godzinami otwarcia) minut otwarcia − minuty blokad.
- `chair_utilization` = zajęte minuty / `available_minutes`.
- `chair_hours_worked` = zajęte minuty / 60 (1 wpis = 1 godzina; wpisy unieważnione nie istnieją w golden).
- `revenue_realized` = Σ `amount_grosze` (grosze).
- `revenue_per_chair_hour` = `revenue_realized` / `chair_hours_worked` (grosze / godzinę).
- `revenue_by_category` = Σ kwot per kategoria (Z1…Z+).
- `provider_hours_worked` = godziny per klucz dentysty (lokalna część e-maila).
- `days_closed_rate` = liczba zamknięć dnia (nieotwartych ponownie) / liczba par (gabinet, dzień z godzinami otwarcia).

## Weryfikacja niezależna

`verify.sql` liczy te same metryki naiwnie z `scheduling.*` + `org.*` (bez kodu TS; fakty analytics
dopiero w K13). Zawiera zahardkodowany tenant i okres.

```bash
pnpm seed:demo                                   # załaduj golden do lokalnej bazy
pnpm --filter @crux/testing verify:golden        # verify.sql (przez withActor) vs expected.json
psql "$DATABASE_URL" -X -A -t -f packages/testing/golden/verify.sql   # to samo ręcznie (superuser)
```

Porównanie: liczby całkowite dokładnie, ilorazy z tolerancją względną 1e-9.
