# 6 · Obłożenie foteli: moduł wzorcowy

Specyfikacja: `docs/specs/F0-010-oblozenie-godzinowe.md` (11 kryteriów akceptacji). Prompt: K11 w czterech częściach. Ten rozdział tłumaczy model i ekran; spec jest źródłem kryteriów.

## 6.1 Model w jednym zdaniu

Fotel × godzina = komórka. Komórka jest pusta (fotel stał), ma wpis (fotel pracował: kto, kategoria Z, opcjonalnie kwota) albo jest zablokowana (serwis, zamknięcie). Dzień gabinetu można zamknąć; potem zmiany wymagają kierownika i powodu.

{{rysunek:oblozenie-stany}}

## 6.2 Ekran `/oblozenie`

{{makieta:oblozenie}}

| Element | Zachowanie |
|---|---|
| Nagłówek | przełącznik gabinetu, data, `←/→`, `T` dziś, przełącznik Dzień/Tydzień, „Dzień jak wczoraj”, „Zamknij dzień” |
| Siatka (`HourGrid`) | kolumny = fotele z chipem gabinetu i wykonawcą z wczoraj; wiersze = godziny otwarcia z wyjątkami; komórki poza godzinami wyszarzone |
| Komórka z wpisem | tło w kolorze kolornika kategorii, pasek 4 px w kolorze krawędzi, inicjały wykonawcy, kategoria, kwota `450 zł` albo `— zł` |
| Komórka zablokowana | kreskowanie mgłą + słowo (serwis, zamknięte, szkolenie) |
| Panel wpisu (`SidePanel`) | wykonawca (`Select` z personelu gabinetu), kategoria (`ChipToggle` Z1–Z+), zakres godzin, kwota w złotych z przecinkiem, notatka ≤ 80 znaków; „Zapisz” (`Ctrl+Enter`), „Unieważnij…” (z powodem) |
| Pasek dnia | godziny z wpisem / dostępne, obłożenie dnia, suma kwot z odsetkiem godzin z kwotą, blokady, stan dnia (otwarty / zamknięty przez kogo i kiedy) |
| Widok tygodnia | `DotCalendar` per fotel i dzień, tabela sum, dni niezamknięte oznaczone |

## 6.3 Klawiatura (recepcja pracuje z rękami na klawiaturze)

| Klawisz | Działanie |
|---|---|
| strzałki | fokus po komórkach (obwódka bursztynowa) |
| `Enter` | otwiera panel wpisu dla komórki (albo edycję istniejącego) |
| `1`–`6` | ustawia kategorię Z1–Z+ od razu, z wykonawcą „jak w sąsiedniej komórce” |
| `Shift` + strzałka | zaznacza zakres godzin na jednym fotelu (jedna komenda `recordOccupancyRange`) |
| `Backspace` | unieważnia wpis (`ConfirmDialog` z powodem) |
| `Ctrl+Enter` | zapis w panelu |
| `Esc` | zamyka panel bez zapisu |
| `T`, `←`, `→` | dziś, poprzedni dzień, następny dzień |

Kryterium AC9: uzupełnienie 3 godzin na dwóch fotelach, unieważnienie jednej i zamknięcie dnia bez myszy (test e2e).

## 6.4 Reguły domeny (gdzie mieszka „mądrość”)

Wszystkie w `packages/modules/scheduling/src/domain/`, testowane jednostkowo z `FixedClock`:

1. pełne godziny lokalne w 1.0 (`hourRange`), z poprawną obsługą zmiany czasu;
2. wpis w godzinach otwarcia gabinetu z wyjątkami; poza nimi tylko z `occupancy.override_hours` i powodem (AC3);
3. wpis nie wchodzi w blokadę fotela (AC8);
4. kategoria z listy Z1–Z+; kwota ≥ 0 w groszach;
5. notatka ≤ 80 znaków i `containsPii === false` (AC7): numery telefonów, PESEL, e-maile są odrzucane;
6. po zamknięciu dnia zmiana wymaga `occupancy.write_closed` i powodu (AC5);
7. unieważnienie zawsze z powodem; wpis zostaje (AC6);
8. gabinet w trybie `appointments` nie przyjmuje wpisów ręcznych dla dni po dacie przełączenia (AC11);
9. nakładanie na fotelu: więz w bazie (`23P01` → `conflict` z komunikatem, AC2).

## 6.5 Przypadki użycia

| Komenda / zapytanie | Uprawnienie | Zdarzenie |
|---|---|---|
| `recordOccupancy` (jedna komórka: tworzy lub aktualizuje) | `occupancy.write` / `occupancy.write_own` | `occupancy.entry_recorded.v1` |
| `recordOccupancyRange` (zakres godzin jednego fotela, jedna transakcja) | jw. | jw. (jedno zdarzenie per wpis) |
| `voidOccupancy` (powód) | `occupancy.void` | `occupancy.entry_voided.v1` |
| `copyDayFrom` („dzień jak wczoraj”: wykonawcy i kategorie, bez kwot) | `occupancy.write` | `occupancy.entry_recorded.v1` |
| `closeDay` | `occupancy.close_day` | `occupancy.day_closed.v1` |
| `reopenDay` (powód) | `occupancy.write_closed` | `occupancy.day_reopened.v1` |
| `createTimeBlock`, `endTimeBlock` | `occupancy.write` | — |
| `getDayGrid(locationIds, day)` (jedna kwerenda, AC10) | `occupancy.read` | — |
| `getWeekSummary`, `listOccupancy(filters)` (lista drążenia) | `occupancy.read` / `analytics.*` | — |

Każda komenda: walidacja Zod, `commandId`, `authorize`, `withActor`, outbox w tej samej transakcji.

## 6.6 Co z tego liczy analityka

Worker po każdym zdarzeniu `occupancy.*` (i co 5 minut dla ostatnich 48 h) przelicza `fact_chair_capacity` (fotel × dzień: minuty otwarcia, blokad, dostępne) i `fact_chair_occupancy` (fotel × dzień × wykonawca × kategoria: minuty, kwota, liczba wpisów). Z tego pochodzą wszystkie metryki 1.0 (rozdział 7). Wpisy unieważnione nie są liczone; dni niezamknięte są liczone, ale oznaczone.

## 6.7 Przejście do 1.1 (żeby nic nie było „wdową”)

Gdy gabinet przechodzi na terminarz Crux, zarząd ustawia `scheduling.occupancy_mode = appointments` dla tego gabinetu (ekran Ustawienia → System, z ostrzeżeniem). Od tej daty:

- obłożenie liczy się z wizyt (statusy inne niż `cancelled`/`no_show`), a każda wizyta utrzymuje wiersz pochodny w `chair_occupancy` (`source = appointment`, bez kwoty), więc historia jest jedną tabelą;
- wpisy ręczne dla dni po przełączeniu są odrzucane; dni sprzed przełączenia zostają jak były;
- kwoty znikają z wpisów w 2.0, gdy źródłem przychodu stają się należności (`revenue_realized` z polem `since` w rejestrze);
- ekran `/oblozenie` zostaje jako widok tygodnia i siatka dla gabinetów w trybie ręcznym (np. nowo otwarty 03, zanim dostanie terminarz).

## 6.8 Dlaczego to jest wzorzec do kopiowania

Moduł ma wszystko, co każdy przyszły moduł: migrację z RLS i pgTAP, domenę z regułami i testami, przypadki użycia z `commandId`/`authorize`/outbox, ekran z komponentami z `packages/ui`, e2e z klawiaturą, zdarzenia konsumowane przez worker, metryki w analityce, specyfikację z `[ID/ACn]`. I celowo nie ma: pacjenta, statusów, integracji. Po K11 powstaje `docs/wzorzec-modulu.md`: lista plików i kolejność kopiowania (w 1.1 kartoteka i terminarz są kopią tego wzorca).
