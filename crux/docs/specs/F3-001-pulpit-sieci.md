# F3-001 · Pulpit sieci

Status: gotowa do planu
Moduły: @crux/analytics, @crux/ui (packages/ui), @crux/platform
Właściciel: Miłosz
Prompt: `prompts/F3-crm-dashboardy.md#K03` (wymaga `#K01`, `#K02`)
Specyfikacja warstwy: `docs/11-dashboardy-i-raporty.md`

## Problem

Zarząd widzi wyniki sieci w KPiR miesiąc po fakcie i w kilku arkuszach prowadzonych ręcznie. Nie da się porównać gabinetów ani lekarzy na tych samych definicjach. Pytanie „ile pieniędzy leży w zaakceptowanych planach bez terminu” nie ma odpowiedzi.

## Rozwiązanie w skrócie

Jeden ekran dla zarządu: kafle KPI z odniesieniem, przychód tygodniowo per gabinet, łuki obłożenia per gabinet, porównanie gabinetów jako wykres kropkowy (tabela w przełączniku), lejek planów, siatka kuleczek recall, źródła pacjentów, rankingi wykonawców; filtry w URL; każda liczba prowadzi do listy rekordów; dane ze schematu `analytics` odświeżanego co 5 minut.

## Historie użytkownika

- Jako zarząd chcę w 60 sekund zobaczyć, czy sieć jest na planie w tym miesiącu i który gabinet odstaje.
- Jako zarząd chcę kliknąć w liczbę i zobaczyć wizyty, należności lub plany, z których powstała.
- Jako zarząd chcę wysłać link do widoku z filtrami wspólnikowi.
- Jako kierownik chcę, żeby mój pulpit liczył to samo co pulpit sieci.

## Kryteria akceptacji

1. **Dane:** zestaw wzorcowy (13 mies., 2 gabinety, 5 wykonawców). **Gdy:** pulpit z `okres=30d&gabinet=all`. **Wtedy:** każdy kafel i wykres pokazuje wartości równe `golden/expected.json` dla metryk `revenue_realized`, `chair_utilization`, `no_show_rate`, `plan_acceptance_rate`, `new_patients`, `avg_ticket`, `plan_open_value`.
2. **Dane:** jak wyżej. **Gdy:** zmiana filtra (`gabinet=01`, `porownaj=rok_temu`, `kategoria=Z5`). **Wtedy:** URL się zmienia, wszystkie karty przeładowują się ze stanem przyciemnienia (bez pustych migotań), a wklejenie URL w nowej karcie odtwarza ten sam widok.
3. **Dane:** lekarz (`analytics.view_self`). **Gdy:** otwiera `/pulpit` lub ustawia `wykonawca=<inny>` na własnym pulpicie. **Wtedy:** przekierowanie do `/pulpit/moje`; parametr jest ignorowany po stronie serwera; zapytanie do `v_self_*` nie zwraca cudzych wierszy (RLS).
4. **Dane:** kafel `no_show_rate` = 4,2% (licznik 21, mianownik 500). **Gdy:** kliknięcie. **Wtedy:** lista `/lista/wizyty?metric=no_show_rate&…` ma zakładki „w liczniku” (21 wizyt) i „w mianowniku” (500), a sumy kontrolne na liście są równe kaflowi.
5. **Dane:** staging z danymi syntetycznymi o wolumenie produkcyjnym (4 gabinety, 13 mies.). **Gdy:** 20 kolejnych wejść na pulpit z różnymi filtrami. **Wtedy:** p95 czasu do interaktywności < 1,5 s; każde zapytanie metryki < 200 ms (log OTel).
6. **Dane:** wykres przychodu z 2 seriami. **Gdy:** nawigacja klawiaturą (Tab na wykres, strzałki). **Wtedy:** tooltip pokazuje wartości punktu z pogrubioną wartością przed nazwą serii; przełącznik „Tabela” pokazuje te same dane w `DataTable` z sumami.
7. **Dane:** gabinet 02 ukryty filtrem. **Gdy:** wykres się przerysowuje. **Wtedy:** gabinet 01 zachowuje swój stały kolor (`loc1`), legenda ma jedną pozycję.
8. **Dane:** rankingi wykonawców. **Gdy:** użytkownik bez `analytics.view_network`. **Wtedy:** sekcja nie jest renderowana ani dostępna przez server action; z uprawnieniem pokazuje górne i dolne 20% wg przychodu/h i konwersji z liczbą godzin grafiku obok, bez kolorów alarmowych.
9. **Dane:** stopka pulpitu. **Gdy:** worker odświeżył `analytics` o 13:05. **Wtedy:** stopka pokazuje „dane odświeżone 13:05”; gdy ostatnie odświeżenie > 20 min temu, stopka pokazuje ostrzeżenie `uwaga` z tekstem.

## Dane

Tylko odczyt ze schematu `analytics` (F3-002) przez rejestr metryk (F3-003). Cele z `platform.settings` (F3-008; w tej specyfikacji linia celu opcjonalna, gdy cel istnieje).

## Uprawnienia

| Rola | Może |
|---|---|
| zarząd (`analytics.view_network`) | pełny pulpit, rankingi, drążenie do numerów kart (nazwiska tylko w gabinetach, gdzie ma członkostwo) |
| kierownik | przekierowanie do `/pulpit/gabinet` |
| lekarz | przekierowanie do `/pulpit/moje` |

## Zdarzenia i integracje

- reaguje na: `analytics.refreshed.v1` (odświeżenie stopki)
- outbox: eksport PDF pulpitu (worker)

## Audyt i prawo

Pulpit sieci nie pokazuje danych osobowych; drążenie do list z nazwiskami podlega RLS gabinetu i zapisuje log dostępu (zasób `patient_list`). Rankingi wykonawców są danymi pracowniczymi: dostęp tylko zarząd.

## UI

Układ z `docs/11`, 5.5 (rząd kafli, wykres główny na całą szerokość, siatka 2 × N); forma każdej karty z rejestru metryk (`docs/11`, 4.6); anatomia kafla i karty z `docs/06`, 4.1–4.2; procedura przy wykresie z `docs/14`, 6.1. Komponenty: `FilterBar`, `KpiTile` (ze `Sparkline`), `LineChart`, `ArchGauge`, `DotPlot`, `DotGrid`, `BarList` (w tym `variant="funnel"`), `DataTable`, `ChartCard`, `DeltaBadge`, `LocationChip` w legendach. Gabinety w stałych kolorach z `color_key` (01 Nowodworska, 02 Białowieska). Stany: ładowanie (przyciemnienie), pusto (okres bez danych), błąd zapytania (karta z komunikatem i „spróbuj ponownie”, reszta pulpitu działa), brak uprawnień. Motyw ciemny. Druk/PDF A4 poziomo w szacie Crux (`crux-krotki-zielen.svg` w nagłówku; raport wewnętrzny dla personelu). Zrzuty ekranu w PR.

## Poza zakresem

Pulpit gabinetu i lekarza (F3-004), cele i alerty (F3-008), raport końca dnia (F3-005), pulpit grupy (F6).

## Otwarte pytania

- Czy pokazywać prognozę miesiąca (przychód do dziś × dni robocze)? (propozycja: tak, jako „tempo”, z definicją w rejestrze `revenue_run_rate`)
