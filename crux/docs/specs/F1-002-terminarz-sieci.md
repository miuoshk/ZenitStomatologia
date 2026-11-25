# F1-002 · Terminarz sieci

Status: gotowa do planu
Moduły: @crux/scheduling, @crux/org, @crux/identity, @crux/patients, @crux/platform
Właściciel: Miłosz
Prompty: `prompts/F1-pacjenci-terminarz.md#K02`, `#K03`, `#K04`

## Problem

Recepcja w gabinecie 01 nie widzi foteli w 02. Pacjent, któremu nie pasuje termin w 01, odchodzi zamiast dostać propozycję w 02 za dwa dni. Lekarz pracujący w obu gabinetach ma dwa grafiki w dwóch programach. Podwójne rezerwacje zdarzają się, bo program nie blokuje ich na poziomie danych.

## Rozwiązanie w skrócie

Jeden terminarz dla wszystkich gabinetów tenanta: kolumny foteli z wielu gabinetów na jednym ekranie, grafiki wykonawców, blokady, kolornik usług, przeciąganie, statusy wizyt z jedną maszyną stanów, przeniesienie wizyty między gabinetami i wyszukiwanie najbliższego wolnego terminu w sieci. Podwójna rezerwacja jest niemożliwa dzięki więzom w bazie.

## Historie użytkownika

- Jako recepcja chcę umówić wizytę w 3 kliknięciach (pacjent, usługa, termin) i z klawiatury.
- Jako recepcja chcę zobaczyć najbliższy wolny termin dla usługi w całej sieci, żeby zaproponować inny gabinet.
- Jako recepcja chcę przeciągnąć wizytę na inny fotel lub godzinę i mieć pewność, że system nie pozwoli na kolizję.
- Jako kierownik chcę ustawić grafik lekarza na tydzień w 01 i 02 bez konfliktów.
- Jako lekarz chcę widzieć tylko mój dzień w moim gabinecie, ale móc podejrzeć sieć.

## Kryteria akceptacji

1. **Dane:** fotel 1 w 01 ma wizytę 10:00–10:30. **Gdy:** ktokolwiek próbuje zapisać wizytę 10:15–10:45 na tym fotelu (UI, server action, bezpośredni `INSERT`). **Wtedy:** zapis jest odrzucony (`23P01` → `{ type: 'conflict' }`) z komunikatem „Ten termin koliduje z wizytą na fotelu 1. Wybierz inny fotel lub godzinę.”
2. **Dane:** lek. Wrona ma wizytę 12:00–13:00 w 01. **Gdy:** recepcja 02 umawia Wronę 12:30 w 02. **Wtedy:** odrzucone (wykonawca nie może być w dwóch miejscach).
3. **Dane:** wizyta `cancelled` 10:00–10:30 na fotelu 1. **Gdy:** nowa wizyta 10:00–10:30 na fotelu 1. **Wtedy:** zapis przechodzi.
4. **Dane:** gabinet 01 otwarty 8:00–20:00, wyjątek 24.12 do 14:00. **Gdy:** recepcja umawia wizytę 24.12 o 15:00. **Wtedy:** odrzucone `outside_working_hours`; kierownik z `appointment.override_hours` i powodem może zapisać; `override_reason` trafia do audytu.
5. **Dane:** usługa Z4 (90 min) wymaga kompetencji Z4; hig. Sowa ma tylko Z1, Z2. **Gdy:** wizyta Z4 u Sowy. **Wtedy:** odrzucone `capability_missing`.
6. **Dane:** fotele w 01 pełne do piątku; fotel 2 w 02 wolny w środę 11:00. **Gdy:** `findFreeSlots(Z1, wszystkie gabinety, od dziś)`. **Wtedy:** pierwszy wynik to środa 11:00 w 02 z oznaczeniem gabinetu i odległości od gabinetu macierzystego pacjenta; wynik w < 100 ms na zestawie wzorcowym.
7. **Dane:** wizyta w 01. **Gdy:** recepcja przenosi ją do 02 (przeciągnięcie między kolumnami lub akcja „Przenieś”). **Wtedy:** powstaje nowa wizyta w 02 (`source = transfer`), stara ma `cancelled` z `cancel_reason = transferred`, oba rekordy są w audycie, pacjent ma w kolejce SMS o nowym gabinecie i adresie.
8. **Dane:** wizyta `scheduled`. **Gdy:** pacjent odpowie TAK na SMS (F1-003) lub recepcja kliknie „potwierdzona”. **Wtedy:** status `confirmed` z `confirmed_via`; przejścia niezgodne z diagramem (`completed → scheduled`) są odrzucane.
9. **Dane:** wizyta jutro 10:00. **Gdy:** anulowana dziś o 15:00 (< 24 h). **Wtedy:** `late_cancellation = true`; anulowana 3 dni wcześniej: `false`.
10. **Dane:** recepcja 01 bez członkostwa w 02 i bez `network.view`. **Gdy:** otwiera terminarz z filtrem „wszystkie gabinety”. **Wtedy:** widzi tylko kolumny 01; zapytanie SQL o wizyty 02 zwraca 0 wierszy (RLS). Zarząd widzi wszystkie.

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowe | `provider_schedules`, `time_blocks`, `appointments`, `appointment_services`, `waitlist_entries` | `03a`, sekcja 5; dwa więzy `EXCLUDE` |
| nowa funkcja | `scheduling.free_slots(...)` | SQL, `generate_series` + zakresy |
| nowa tabela | `appointment_plan_items` (F2) | nie w tej specyfikacji |

## Uprawnienia

| Rola | Może |
|---|---|
| recepcja | czytać (własne gabinety), umawiać, przesuwać, anulować, zmieniać statusy, przenosić |
| lekarz, higienistka | czytać własne gabinety, zmieniać status własnych wizyt (`arrived`, `in_chair`, `completed`) |
| asystentka | czytać, statusy |
| kierownik | wszystko w swoim gabinecie + grafiki + nadpisanie godzin |
| zarząd | wszystko (`network.view`) |

## Zdarzenia i integracje

- publikuje: `appointment.booked.v1`, `appointment.moved.v1`, `appointment.transferred.v1`, `appointment.cancelled.v1`, `appointment.confirmed.v1`, `appointment.completed.v1`, `appointment.no_show.v1`
- reaguje na: `sms.reply.v1` (F1-003) → `confirmed`
- outbox: przypomnienia (F1-003), lista oczekujących przy anulowaniu (F1-004)

## Audyt i prawo

Każda zmiana wizyty w audycie (kto, co, przed/po). Notatka recepcji nie może zawierać danych medycznych (instrukcja + lint tekstu na słowa kluczowe jako ostrzeżenie). Przeniesienie między gabinetami w jednym tenancie nie jest udostępnieniem dokumentacji.

## UI

`/terminarz` dzień/tydzień, `ScheduleGrid` (ADR-019), panel boczny wizyty, dialog nowej wizyty z „najbliższy wolny termin w sieci”, `/terminarz/grafiki`. Skróty: `N`, `T`, `←/→`, `M` (przenieś), `Esc`. iPad: dotyk, 44 px. Stany: pusty dzień (rycina mięty, „Brak wizyt. Dodaj pierwszą.”), ładowanie bez migania, kolizja z komunikatem i podświetleniem konfliktu.

## Poza zakresem

Lista oczekujących (F1-004), SMS (F1-003), rezerwacja online (F1-007), ZnanyLekarz (F1-008), rozliczenie wizyty (F2-004).

## Otwarte pytania

- Krok siatki 10 czy 15 min? (propozycja: 15 min, z możliwością wizyt o dowolnej długości w minutach)
- Czy asystentka jest zasobem blokowanym jak wykonawca? (propozycja F1: nie; F2: opcjonalnie)
