# F0-010 · Obłożenie godzinowe foteli (moduł wzorcowy)

Status: gotowa do planu
Wydanie: 1.0 „Krasnodrzew”
Moduły: @crux/scheduling, @crux/org, @crux/identity, @crux/platform, @crux/ui
Właściciel: Miłosz
Prompt: `prompts/F0-fundament.md#K11` (wymaga K01–K10)
Specyfikacja warstwy: `docs/03` (ChairOccupancy), `docs/03a` (sekcja 5.1), `docs/11` (sekcja 4.7)

Ten moduł budujemy w wydaniu 1.0 w całości jako **wzorzec**: każdy kolejny moduł kopiuje jego strukturę, testy, RLS i sposób budowy ekranów (`docs/wzorzec-modulu.md` powstaje po nim). Jest celowo prosty: nie ma pacjenta, statusów ani integracji, więc wzorzec pokazuje czysty szkielet (migracja → domena → przypadki użycia → ekran → zdarzenia → analityka).

## Problem

Nie wiemy, ile naprawdę pracują fotele w 01 i 02, ile zarabia godzina fotela i jak różnią się gabinety. Stary program ma terminarz, ale nie liczy obłożenia na jednej definicji dla całej sieci, a zarząd widzi przychód dopiero w KPiR. Pełny terminarz Crux (wizyty z pacjentami) wymaga najpierw opinii prawnej, DPIA i umów powierzenia (tor B), więc czekanie na niego oznacza brak danych przez kolejne miesiące.

## Rozwiązanie w skrócie

Siatka godzinowa per gabinet: kolumny to fotele, wiersze to godziny otwarcia. Recepcja (albo wykonawca za siebie) zaznacza godziny, w których fotel pracował: wykonawca, kategoria usługi Z1–Z+, opcjonalnie kwota zrealizowana. Blokady foteli (serwis, zamknięcie) zmniejszają pojemność. Na koniec dnia „Zamknij dzień” potwierdza kompletność. Wpis nie zawiera żadnych danych pacjenta. Schemat `analytics` liczy z tego obłożenie, godziny i przychód na pulpitach od pierwszego dnia (F0-011). Po przejściu gabinetu na terminarz Crux (1.1) obłożenie liczy się z wizyt, a ta sama tabela przechowuje wiersze pochodne, więc historia jest ciągła.

## Historie użytkownika

- Jako recepcja chcę uzupełnić obłożenie dnia w 2 minuty z klawiatury, żeby nie dokładać sobie pracy obok starego programu.
- Jako recepcja chcę skopiować wczorajszy układ wykonawców i kategorii („dzień jak wczoraj”), żeby poprawić tylko różnice.
- Jako kierownik chcę zamknąć dzień i mieć pewność, że pulpit liczy z kompletnych danych.
- Jako lekarz chcę widzieć na własnym pulpicie tylko moje godziny i moją kwotę.
- Jako zarząd chcę widzieć obłożenie i przychód na godzinę fotela per gabinet na jednej definicji, od pierwszego tygodnia po wdrożeniu.

## Kryteria akceptacji

1. **Dane:** gabinet 01 z 3 fotelami, godziny otwarcia 8:00–20:00, recepcja 01. **Gdy:** zapisuje wpis fotel 2, 10:00–11:00, wykonawca A, kategoria Z3, kwota 450 zł. **Wtedy:** wiersz `chair_occupancy` z `period = [10:00, 11:00)` w czasie lokalnym, `amount_grosze = 45000`, `source = manual`, wpis w `audit.events`, zdarzenie `occupancy.entry_recorded.v1` w outboxie, siatka pokazuje blok w kolorze Z3 z inicjałami i kwotą.
2. **Dane:** jak wyżej. **Gdy:** drugi wpis na fotelu 2 w 10:30–11:30. **Wtedy:** baza odrzuca (`23P01`), użytkownik dostaje komunikat „Ta godzina na fotelu 2 ma już wpis. Zmień godzinę lub popraw istniejący wpis.”
3. **Dane:** godziny otwarcia 8:00–20:00. **Gdy:** recepcja zapisuje wpis 20:00–21:00. **Wtedy:** odrzucone z komunikatem; kierownik z `occupancy.override_hours` zapisuje ten sam wpis z powodem, a powód jest w `override_reason` i audycie.
4. **Dane:** recepcja 01 bez członkostwa w 02; użytkownik tenanta B. **Gdy:** próbują odczytać lub zapisać wpisy gabinetu 02 tenanta A (UI, server action, SQL). **Wtedy:** nie widzą i nie zapiszą (RLS `tenant_location`, pgTAP); `network_admin` widzi oba gabinety.
5. **Dane:** dzień 12.11 w 01 z 18 wpisami. **Gdy:** recepcja klika „Zamknij dzień”. **Wtedy:** powstaje `occupancy_day_closures` z podsumowaniem (godziny, kwota, fotele bez wpisów), zdarzenie `occupancy.day_closed.v1`; próba edycji wpisu z tego dnia przez recepcję jest odrzucona („Dzień zamknięty. Poproś kierownika.”), a kierownik edytuje po podaniu powodu (`occupancy.write_closed`).
6. **Dane:** wpis z AC1. **Gdy:** recepcja unieważnia go z powodem „pomyłka fotela”. **Wtedy:** wiersz zostaje z `voided_at` i `void_reason`, siatka go nie pokazuje, analityka nie liczy, więz wykluczający pozwala wpisać nową godzinę w tym miejscu; unieważnienie bez powodu jest odrzucone.
7. **Dane:** notatka „pacjent Kowalski 600123456”. **Gdy:** zapis. **Wtedy:** odrzucone z komunikatem „Notatka nie może zawierać danych pacjenta.” (`containsPii`: numer telefonu); notatka „wymiana żarówki w lampie” przechodzi.
8. **Dane:** blokada fotela 3 (serwis) 12:00–14:00. **Gdy:** wpis na fotelu 3 o 13:00. **Wtedy:** odrzucony; `fact_chair_capacity` dla tego dnia ma `blocked_minutes = 120`.
9. **Dane:** siatka dnia. **Gdy:** użytkownik używa tylko klawiatury (strzałki, `Enter`, `1`–`6`, `Shift+strzałka`, `Backspace`). **Wtedy:** uzupełnia 3 godziny na dwóch fotelach, unieważnia jedną i zamyka dzień bez myszy (e2e).
10. **Dane:** gabinet z 3 fotelami i 12 godzinami otwarcia, 30 wpisów. **Gdy:** otwarcie `/oblozenie`. **Wtedy:** jedna kwerenda zwraca fotele, godziny, wpisy, blokady i status zamknięcia; p95 renderu < 300 ms na zestawie wzorcowym.
11. **Dane:** gabinet 01 w trybie `appointments` (ustawienie od 1.1). **Gdy:** recepcja próbuje dodać wpis ręczny na dzień po dacie przełączenia. **Wtedy:** odrzucone z komunikatem, że obłożenie liczy się z terminarza (reguła istnieje od 1.0, żeby przełączenie nie wymagało zmiany modułu).

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowa | `chair_occupancy` | `03a` 5.1; `tenant_location`; więz wykluczający dla wpisów nieunieważnionych; bez `delete` |
| nowa | `occupancy_day_closures` | `03a` 5.1; `tenant_location`; `unique (location_id, day)` |
| nowa | `time_blocks` | `03a` 5.1; w 1.0 tylko `chair_id`; 1.1 doda użycie `staff_id` |
| enum | `occupancy_source` | manual, appointment, import |
| ustawienie | `scheduling.occupancy_mode` | `platform.settings` per gabinet; `manual` domyślnie |
| analityka | `fact_chair_capacity`, `fact_chair_occupancy`, `fact_day_closures` | F0-011 |

## Uprawnienia

Macierz w `docs/03`, sekcja 8. W skrócie: `occupancy.read` (wszystkie role w gabinecie), `occupancy.write` (recepcja, kierownik, zarząd), `occupancy.write_own` (lekarz, higienistka: tylko `provider_id = ja`), `occupancy.void` (recepcja w dniu otwartym, własne dla wykonawców, kierownik zawsze), `occupancy.close_day` (recepcja, kierownik), `occupancy.write_closed` i `occupancy.override_hours` (kierownik, zarząd).

## Zdarzenia i integracje

- publikuje: `occupancy.entry_recorded.v1` `{ tenantId, locationId, chairId, day }`, `occupancy.entry_voided.v1`, `occupancy.day_closed.v1` `{ tenantId, locationId, day }`, `occupancy.day_reopened.v1`
- reaguje na: — (1.1: `appointment.*` tworzą wiersze pochodne dla gabinetów w trybie `appointments`)
- worker: zdarzenia zlecają `analytics.refresh` dla gabinetu i dnia
- outbox: brak wysyłek zewnętrznych

## Audyt i prawo

Wpis nie zawiera danych pacjenta (ADR-032); zawiera dane pracownicze (kto pracował) i kwoty pomocnicze. Audyt wszystkich zmian z `before`/`after`; unieważnienie i edycja po zamknięciu dnia wymagają powodu. Kwoty są pomiarem; księgowość zostaje w Optimie; od 2.0 źródłem przychodu są należności (`charges`), a wpisy obłożenia przestają nieść kwoty. Retencja 5 lat (`03a`, sekcja 15).

## UI

`/oblozenie?gabinet=01&dzien=YYYY-MM-DD`: nagłówek (przełącznik gabinetu, data, `←/→`, `T` dziś), siatka `HourGrid` (kolumny foteli z chipem gabinetu, wiersze godzin otwarcia), komórki: wolna, wpis (tło kolornika, pasek 4 px w kolorze krawędzi kategorii, inicjały wykonawcy, kwota `450 zł`), blokada (kreskowanie + słowo), poza godzinami (wyszarzone). `SidePanel` wpisu: wykonawca, kategoria (`ChipToggle` Z1–Z+), kwota (złote z przecinkiem), zakres godzin, notatka; przyciski „Zapisz” (`Ctrl+Enter`), „Unieważnij” (z powodem). Pasek dnia: suma godzin, suma kwot, „Dzień jak wczoraj”, „Zamknij dzień” (`ConfirmDialog` z podsumowaniem i listą foteli bez wpisów); stan „Dzień zamknięty 18:42 · K. Nowak” z „Otwórz ponownie” dla uprawnionych. `/oblozenie/tydzien`: `DotCalendar` per fotel i dzień, tabela sum, dni niezamknięte oznaczone. `EmptyState` bez foteli: rycina mięty, „Ten gabinet nie ma jeszcze foteli. Dodaj je w Ustawieniach.” iPad 1024×768: komórki ≥ 44 px.

## Poza zakresem

Pacjenci, wizyty, statusy wizyt, grafiki wykonawców (1.1); import historii ze starego programu (1.1, F1-006); rozliczenia wykonawców z kwot (2.0 liczy z należności); minutowa dokładność wpisów w UI (baza ją dopuszcza).

## Otwarte pytania

- Czy kwotę wpisuje recepcja z paragonu per godzina, czy wykonawca za siebie? Propozycja: obie role mogą; `revenue_per_chair_hour` dzieli przez wszystkie przepracowane godziny (prawdziwa produktywność), a kafel pokazuje obok odsetek godzin z wpisaną kwotą, żeby było widać, na ile liczba jest kompletna.
- Czy sobota liczy się do dni roboczych w `days_closed_rate`? Propozycja: tak, jeśli gabinet ma godziny otwarcia w sobotę.
