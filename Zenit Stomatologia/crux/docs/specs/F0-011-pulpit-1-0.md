# F0-011 · Analityka i pulpity wydania 1.0

Status: w realizacji (K13 zamknięty lokalnie: schemat `analytics`, zasilanie workera, rejestr 7 metryk, drążenie, testy AC1/AC3/AC4/AC5 po stronie danych; K14 UI gotowe lokalnie, bez zatwierdzenia: pulpity `/pulpit`, `/pulpit/gabinet`, `/pulpit/moje`, lista `/lista/oblozenie` z CSV, e2e `pulpit.spec.ts`; do domknięcia: zrzuty w obu motywach w PR, edycja celów w K15, mediana gabinetu dla lekarza, p95 AC6 na stagingu)
Wydanie: 1.0 „Krasnodrzew”
Moduły: @crux/analytics, @crux/ui, @crux/platform, apps/worker
Właściciel: Miłosz
Prompty: `prompts/F0-fundament.md#K13` (schemat, zasilanie, rejestr), `#K14` (pulpity, lista drążenia); wymagają K11 i K12
Specyfikacja warstwy: `docs/11` (sekcje 3, 4.6, 4.7, 5.7, 6, 8, 9), `docs/03a` (sekcja 12.1), `docs/06` (sekcje 4.1, 4.2, 6)

Pełny pulpit sieci (F3-001) powstaje w wydaniu 2.1 na tych samych fundamentach: ta specyfikacja buduje schemat `analytics`, zasilanie, rejestr metryk i trzy pulpity na siedmiu metrykach obłożenia i przychodu. Nic z tego nie jest tymczasowe: kolejne wydania tylko dokładają fakty i metryki.

## Problem

Zarząd porównuje gabinety z arkuszy i pamięci. Nawet gdy dane są wpisane (F0-010), bez jednej definicji „obłożenia” i „przychodu na godzinę” każdy liczy inaczej. Metryka liczona ad hoc w kodzie ekranu nie ma testu ani drążenia, więc nikt jej nie ufa.

## Rozwiązanie w skrócie

Osobny schemat `analytics` zasilany przez worker co 5 minut; rejestr metryk jako kod (`id`, definicja, SQL, forma, drążenie) z testem na zestawie wzorcowym; trzy pulpity (sieć, gabinet, moje) z jednym wierszem filtrów w URL; każda liczba prowadzi do listy wpisów, z których powstała; formy z modelu kuleczkowego (łuk obłożenia, wykres kropkowy, pasek części, kalendarz kuleczek).

## Historie użytkownika

- Jako zarząd chcę w 5 sekund zobaczyć obłożenie i przychód na godzinę fotela w 01 i 02 w tym miesiącu, a w 30 sekund dojść do dnia, który psuje wynik.
- Jako zarząd chcę wysłać wspólnikowi link, który otworzy dokładnie ten sam widok.
- Jako kierownik 01 chcę widzieć swój gabinet i wykonawców, bez danych 02.
- Jako lekarz chcę widzieć moje godziny i kwoty, porównane do mediany gabinetu bez nazwisk.
- Jako zarząd chcę wiedzieć, które dni nie są zamknięte, bo wtedy liczby są niepełne.

## Kryteria akceptacji

1. **Dane:** zestaw wzorcowy (13 mies., 2 gabinety, 5 wykonawców, wpisy obłożenia z K12). **Gdy:** `/pulpit?okres=30d&gabinet=all`. **Wtedy:** każdy kafel i wykres pokazuje wartości równe `golden/expected.json` dla `chair_utilization`, `chair_hours_worked`, `revenue_realized`, `revenue_per_chair_hour`, `revenue_by_category`, `provider_hours_worked`, `days_closed_rate` (test `[F0-011/AC1]` per metryka).
2. **Dane:** jak wyżej. **Gdy:** zmiana filtra (`gabinet=01`, `porownaj=poprzedni`, `kategoria=Z5`). **Wtedy:** URL się zmienia, wszystkie karty przeładowują się ze stanem przyciemnienia (bez pustych migotań), a wklejenie URL w nowej karcie odtwarza ten sam widok.
3. **Dane:** lekarz (`analytics.view_self`), kierownik 01 (`analytics.view_location`). **Gdy:** lekarz otwiera `/pulpit` lub ustawia `wykonawca=<inny>`; kierownik ustawia `gabinet=02`. **Wtedy:** lekarz jest przekierowany do `/pulpit/moje`, parametr jest ignorowany po stronie serwera, zapytanie do `v_self_*` nie zwraca cudzych wierszy (RLS); kierownik dostaje swój gabinet, a `v_location_*` nie zwraca wierszy 02 (pgTAP).
4. **Dane:** kafel `chair_hours_worked` = 412 h. **Gdy:** kliknięcie. **Wtedy:** `/lista/oblozenie?metric=chair_hours_worked&…` pokazuje wpisy, których suma minut ÷ 60 = 412,0 (suma kontrolna na liście równa kaflowi); dla `chair_utilization` zakładki „w liczniku” (wpisy) i „w mianowniku” (pojemność per fotel i dzień).
5. **Dane:** wpis dodany o 10:03. **Gdy:** worker wykona `analytics.refresh` (co 5 min). **Wtedy:** pulpit pokazuje nową wartość najpóźniej o 10:10, a stopka `refreshed_at` ma czas ostatniego odświeżenia; dwukrotne uruchomienie odświeżenia nie zmienia wyniku (idempotencja).
6. **Dane:** staging z zestawem wzorcowym. **Gdy:** 20 kolejnych wejść na `/pulpit` z różnymi filtrami. **Wtedy:** p95 czasu do interaktywności < 1,5 s; każde zapytanie metryki < 200 ms (log OTel).
7. **Dane:** każda karta pulpitu. **Gdy:** użytkownik przełącza „Wykres | Tabela” i nawiguje klawiaturą. **Wtedy:** widok tabeli ma te same liczby co wykres; punkty wykresu dostają fokus, strzałki przesuwają fokus, tooltip pokazuje wartość pogrubioną przed nazwą serii; `role="img"` ma opis.
8. **Dane:** schemat `analytics`. **Gdy:** `pnpm doctor`. **Wtedy:** reguły `analytics.no-pii`, `analytics.metric-registered`, `ui.metric-form` przechodzą; każde `runMetric` w `apps/web` ma wpis w rejestrze i wiersz w `docs/11`, sekcja 4.7.
9. **Dane:** `analytics.targets.chair_utilization = 0,75` dla 01. **Gdy:** `porownaj=cel`. **Wtedy:** kafel pokazuje różnicę do celu ze strzałką i słowem, a wykres główny ma szarą przerywaną linię „cel”.
10. **Dane:** gabinet 02 ma 3 dni bez zamknięcia w okresie. **Gdy:** otwarcie pulpitu. **Wtedy:** karta „Jakość danych” wymienia te dni z linkiem do `/oblozenie?gabinet=02&dzien=…`, a `days_closed_rate` = (dni robocze − 3) ÷ dni robocze.

## Dane

| Zmiana | Tabela / widok | Uwagi |
|---|---|---|
| nowe | `analytics.dim_date`, `dim_location`, `dim_chair`, `dim_provider`, `dim_category` | `03a` 12.1 |
| nowe | `analytics.fact_chair_capacity`, `fact_chair_occupancy`, `fact_day_closures`, `refresh_log` | `03a` 12.1; RLS `tenant_location` |
| widoki | `v_self_occupancy`, `v_location_*`, `v_network_*` | per rola |
| ustawienia | `analytics.targets.<metric>` per gabinet i miesiąc | `platform.settings`; edycja w `/ustawienia/system` (K15) |
| kod | `packages/modules/analytics/src/metrics/registry.ts`, `metrics/<id>.ts` | 7 metryk z `docs/11`, 4.7 |

## Uprawnienia

`analytics.view_network` (zarząd, księgowość), `analytics.view_location` (kierownik), `analytics.view_self` (lekarz, higienistka), `analytics.export` (CSV: zarząd, kierownik, księgowość). Macierz: `docs/03`, sekcja 8.

## Zdarzenia i integracje

- reaguje na: `occupancy.entry_recorded.v1`, `occupancy.entry_voided.v1`, `occupancy.day_closed.v1`, `occupancy.day_reopened.v1` (zlecenie odświeżenia gabinetu i dnia)
- worker: `analytics.refresh` co 5 min (przyrost) i 02:10 (pełne 13 miesięcy); `refresh_log`
- outbox: brak wysyłek zewnętrznych

## Audyt i prawo

Schemat `analytics` nie zawiera danych pacjentów (w 1.0 nie istnieją; reguła `analytics.no-pii` chroni kolejne wydania). Zawiera dane pracownicze (godziny i kwoty per wykonawca): dostęp wg ról, pulpit lekarza bez nazwisk innych osób, eksport CSV z wpisem w `audit.events`. Kwoty z wpisów są pomiarem (F0-010).

## UI

Układ z `docs/11`, 5.7; anatomia kafla i karty z `docs/06`, 4.1–4.2; procedura przy wykresie z `docs/14`, 6.1. Komponenty: `FilterBar`, `KpiTile` (ze `Sparkline` i `DeltaBadge`), `ChartCard`, `ArchGauge`, `DotPlot`, `PartsBar`, `DotCalendar`, `LineChart`, `BarList`, `DataTable`, `LocationChip` w legendach. Kolory gabinetów z `color_key` (01 Nowodworska zieleń, 02 Białowieska niebieski). Stany: ładowanie (przyciemnienie), pusto („Brak wpisów w tym okresie. Zmień okres lub gabinet.”), błąd zapytania (karta z komunikatem i „Spróbuj ponownie”, reszta działa), brak uprawnień. Motyw ciemny. Zrzuty w PR w obu motywach.

## Poza zakresem

Metryki wizyt, nieobecności, planów, pacjentów i należności (od 1.1 i 2.0); raport „Koniec dnia” i odprawa (2.1); rankingi wykonawców (2.1); PDF pulpitu (2.1); alerty (2.1, F3-008) — w 1.0 jedynym sygnałem jakości danych jest karta dni niezamkniętych.

## Otwarte pytania

- Cel obłożenia per gabinet: ustawiamy od razu w K17 (propozycja: 01 → 75%, 02 → 65% na start, korekta po pierwszym miesiącu pomiaru)?
- Czy księgowość (rola `accountant`) dostaje konto już w 1.0? Propozycja: nie, dopóki kwoty są z wpisów ręcznych.
