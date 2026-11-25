# 11 · Dashboardy i raporty

Wersja 1.2 · 6 listopada 2026. Specyfikacja warstwy analitycznej: role i pulpity, filtry, rejestr metryk, forma wizualna metryk, metryki i pulpity wydania 1.0 (sekcje 4.7, 5.7), drążenie, alerty, odświeżanie, wygląd. Dane: schemat `analytics` (ADR-027, `03a` sekcja 12). Tokeny, anatomia kafla i karty, model kuleczkowy: `06-design-system.md` (sekcje 4.1, 4.2, 6). Procedura przy każdym wykresie i lista kontrolna: `14-guideline-aplikacji.md` (sekcje 6, 11). Prototyp: `design/crux-dashboard-prototyp.html`. Wzorce z rynku: `08`, sekcja 3 (Jarvis, Dentrix Ascend).

## 1. Zasady (z marki do liczb)

1. **Spokój.** Pulpit domyślnie pokazuje stan i to, co wymaga działania dziś. Nie ma czerwonych liczników „dla zasady”; stan zawsze z ikoną i słowem, kolor jest dodatkiem.
2. **Precyzja.** Każda liczba ma wpis w rejestrze metryk (sekcja 4), SQL w kodzie, test na zestawie wzorcowym i drążenie do rekordów. Metryka bez wpisu nie trafia na ekran (`crux-doctor`).
3. **Ciągłość.** Te same definicje w każdym gabinecie i na każdym poziomie. Pulpit lekarza liczy przychód tak samo jak pulpit sieci.
4. **Jeden wiersz filtrów rządzi wszystkim pod spodem.** Filtry w URL. Zmiana filtra nie miga: poprzedni stan zostaje przyciemniony do czasu nowych danych.
5. **Liczba z odniesieniem.** Każdy KPI ma punkt odniesienia: poprzedni okres, cel, mediana sieci albo ten sam okres rok temu. Bez odniesienia liczba nic nie mówi.
6. **Szybki przegląd przed głębią.** Każdy pulpit otwiera się na rzędzie kafli (4; pulpit gabinetu i sieci na ekranie ≥ 1440 px: 6) i jednym wykresie głównym na całą szerokość; niżej siatka 2 × N kart. Czytelny w 5 sekund, po drążeniu odpowiada w 30. Szczegóły są jedno kliknięcie dalej.
7. **Kuleczki tam, gdzie liczba ma naturalne 100% albo jest policzalna.** Obłożenie, potwierdzenia, realizacja planu to łuk obłożenia; „37 z 50” to siatka kuleczek; porównanie gabinetów w kilku miarach to wykres kropkowy (`06`, sekcja 6). Wykres kołowy nie istnieje.

## 2. Role i pulpity

| Pulpit | Dla kogo | Pytanie, na które odpowiada | Zakres danych |
|---|---|---|---|
| **Dziś** (`/dzis`) | recepcja, asystentki, lekarze | co się dzieje teraz w gabinecie i co trzeba zrobić zaraz | bieżący dzień, własny gabinet (lub wszystkie dla sieci) |
| **Przegląd 60 sekund** (`/dzis/odprawa`) | zespół gabinetu, 8:00 | na co zwrócić uwagę dziś: luki, nieobecności z wczoraj, prace lab, zaległe recall, pacjenci z saldem | dziś + wczoraj + najbliższe 3 dni |
| **Pulpit gabinetu** (`/pulpit/gabinet`) | kierownik gabinetu | czy gabinet pracuje jak powinien | jeden gabinet, okresy do roku |
| **Pulpit lekarza** (`/pulpit/moje`) | lekarz, higienistka | jakie są moje wyniki i rozliczenie | tylko własne dane; porównanie do mediany sieci bez nazwisk |
| **Pulpit sieci** (`/pulpit`) | zarząd | gdzie sieć zarabia i traci; który gabinet, lekarz, usługa | wszystkie gabinety tenanta |
| **Koniec dnia** (e-mail/Teams 21:00) | zarząd, kierownicy | co się wydarzyło dziś w liczbach | dzień; agregaty bez nazwisk pacjentów |
| **Pulpit grupy** (`/pulpit/grupa`, F6) | właściciele grupy | agregaty wielu podmiotów | tylko `analytics` bez danych osobowych |

Dostęp: `analytics.view_self` (lekarz), `analytics.view_location` (kierownik), `analytics.view_network` (zarząd), `analytics.view_group`. RLS na widokach `analytics.v_*` egzekwuje to niezależnie od UI.

## 3. Filtry: kontrakt

| Parametr URL | Wartości | Domyślnie | Uwagi |
|---|---|---|---|
| `okres` | `dzis`, `7d`, `30d`, `mtd`, `kw`, `rok`, `od=YYYY-MM-DD&do=YYYY-MM-DD` | `30d` | okres kalendarzowy do dziś włącznie |
| `porownaj` | `poprzedni`, `rok_temu`, `cel`, `mediana_sieci`, `brak` | `poprzedni` | zmienia deltę na kaflach i linię odniesienia na wykresach |
| `gabinet` | `all`, `01`, `02`, … (wiele: `01,02`) | wg roli | kierownik: zablokowany na swój |
| `wykonawca` | `all`, id | `all` | lekarz i higienistka: zablokowani na siebie |
| `kategoria` | `Z1`…`Z+`, wiele | wszystkie | filtr kategorii usług |
| `zrodlo` | `all`, `znanylekarz`, `online`, `polecenie`… | `all` | tylko metryki pacjentów |
| `widok` | `wykres`, `tabela` | `wykres` | per karta, zapamiętywany lokalnie |

Zasady: filtry zapisują się w URL (link do wysłania), ostatnio użyte w `localStorage` per użytkownik; niedozwolone kombinacje (lekarz próbuje `wykonawca=inny`) są ignorowane już po stronie serwera.

## 4. Rejestr metryk

Każda metryka: `id` (klucz w kodzie), definicja, ziarno, kierunek (↑ dobrze / ↓ dobrze / neutralna), kto widzi, drążenie. SQL w `packages/modules/analytics/src/metrics/<id>.ts`. Zestaw wzorcowy `golden/` ma dla każdej metryki wejście i oczekiwany wynik.

### 4.1 Przychód i pieniądze

| id | Nazwa | Definicja | Ziarno | Kierunek | Drążenie |
|---|---|---|---|---|---|
| `revenue_realized` | Przychód zrealizowany | od 2.0: suma `charges.final_amount` dla należności z `charged_at` w okresie, minus storna; **w 1.0–1.1**: suma `amount_grosze` z nieunieważnionych wpisów obłożenia (pole `since` w rejestrze dokumentuje zmianę źródła bez zmiany `id`) | gabinet, lekarz, usługa/kategoria, dzień | ↑ | 2.0: lista należności; 1.0: lista wpisów |
| `collections` | Wpływy | suma `payments.amount` przyjętych w okresie minus storna | gabinet, dzień, metoda | ↑ | lista płatności |
| `collection_rate` | Ściągalność | wpływy zaalokowane do należności z okresu ÷ przychód zrealizowany | gabinet | ↑ | należności nieopłacone |
| `receivables_aging` | Należności wg wieku | suma nieopłaconych należności w koszykach 0–30, 31–60, 61–90, >90 dni | gabinet, pacjent (anon na sieci) | ↓ | lista pacjentów z saldem (kierownik) |
| `avg_ticket` | Średnia wartość wizyty | przychód zrealizowany ÷ liczba wizyt `completed` | gabinet, lekarz | ↑ | wizyty |
| `revenue_per_chair_hour` | Przychód na godzinę fotela | przychód zrealizowany ÷ dostępne godziny foteli (z `fact_chair_capacity`) | gabinet, fotel | ↑ | dni |
| `revenue_per_provider_hour` | Przychód na godzinę wykonawcy | przychód wykonawcy ÷ godziny z grafiku | lekarz | ↑ | dni |
| `revenue_by_category` | Przychód wg kategorii | przychód zrealizowany w podziale Z1–Z+ | gabinet, kategoria | neutralna | należności |
| `lab_cost_ratio` | Koszt laboratorium / przychód protetyczny | koszt zleceń lab (data odbioru w okresie) ÷ przychód Z5 | gabinet | ↓ | zlecenia |
| `provider_fee_accrued` | Narastające wynagrodzenie wykonawcy | wg `provider_contracts` dla bieżącego miesiąca (podgląd przed rozliczeniem) | lekarz | neutralna | pozycje |

### 4.2 Obłożenie i terminarz

| id | Nazwa | Definicja | Ziarno | Kierunek | Drążenie |
|---|---|---|---|---|---|
| `chair_utilization` | Obłożenie foteli | minuty obłożenia ÷ dostępne minuty foteli (godziny otwarcia z wyjątkami minus blokady foteli); minuty obłożenia: gabinet w trybie `manual` → wpisy `chair_occupancy` nieunieważnione; gabinet w trybie `appointments` → wizyty o statusie innym niż `cancelled`/`no_show` | gabinet, fotel, wykonawca, dzień | ↑ | 1.0: wpisy i pojemność per dzień; 1.1: dni z lukami |
| `provider_utilization` | Obłożenie wykonawcy | minuty wizyt wykonawcy ÷ minuty grafiku | lekarz | ↑ | dni |
| `schedule_gaps_next_7d` | Luki w najbliższych 7 dniach | suma wolnych bloków ≥ 30 min w grafikach | gabinet, lekarz | ↓ | sloty (do wypełnienia z listy oczekujących) |
| `no_show_rate` | Nieobecności | `no_show` ÷ wizyty, które powinny się odbyć (bez anulowanych ≥ 24 h przed) | gabinet, lekarz, źródło | ↓ | wizyty |
| `late_cancellation_rate` | Późne odwołania | anulowane < 24 h ÷ zaplanowane | gabinet | ↓ | wizyty |
| `confirmation_rate` | Potwierdzenia | wizyty `confirmed` przed startem ÷ wizyty z wysłanym przypomnieniem | gabinet | ↑ | wizyty niepotwierdzone |
| `lead_time_days` | Czas do najbliższego wolnego terminu | mediana dni od dziś do pierwszego wolnego slotu Z1 | gabinet, lekarz | neutralna (cel: 3–10 dni) | sloty |
| `visits_completed` | Wizyty zakończone | liczba `completed` | gabinet, lekarz | ↑ | wizyty |

### 4.3 Pacjenci i marketing

| id | Nazwa | Definicja | Ziarno | Kierunek | Drążenie |
|---|---|---|---|---|---|
| `new_patients` | Nowi pacjenci | pacjenci, których pierwsza wizyta `completed` przypada w okresie | gabinet, źródło | ↑ | pacjenci (anon na sieci) |
| `new_patients_by_source` | Nowi pacjenci wg źródła | jak wyżej w podziale `acquisition_source` | źródło | neutralna | pacjenci |
| `active_patients` | Pacjenci aktywni | pacjenci z wizytą `completed` w ostatnich 18 mies. | gabinet | ↑ | — |
| `retention_18m` | Retencja | pacjenci aktywni 18 mies. temu, którzy mieli wizytę w ostatnich 18 mies. ÷ wszyscy aktywni 18 mies. temu | gabinet | ↑ | pacjenci bez wizyty |
| `hygiene_reappointment_rate` | Ponowne umówienie higienizacji | wizyty Z2 zakończone, po których w 14 dni umówiono kolejną Z2 ÷ wizyty Z2 zakończone | gabinet, higienistka | ↑ | wizyty bez kolejnej |
| `recall_effectiveness` | Skuteczność recall | zadania zamknięte umówioną wizytą w 30 dni od terminu ÷ zadania z terminem w okresie | gabinet, reguła | ↑ | zadania |
| `recall_backlog` | Recall zaległy | otwarte zadania recall po terminie | gabinet | ↓ | lista do dzwonienia |
| `patient_debt_count` | Pacjenci z saldem ujemnym | liczba pacjentów z nieopłaconymi należnościami > 0 | gabinet | ↓ | lista (kierownik) |

### 4.4 Plany leczenia

| id | Nazwa | Definicja | Ziarno | Kierunek | Drążenie |
|---|---|---|---|---|---|
| `plans_presented` | Plany przedstawione | plany z `presented_at` w okresie | gabinet, lekarz | neutralna | plany |
| `plan_acceptance_rate` | Konwersja planów | plany `accepted` ÷ plany `presented` w okresie (po dacie przedstawienia, z oknem 30 dni) | gabinet, lekarz | ↑ | plany nieprzyjęte |
| `plan_acceptance_value_rate` | Konwersja wartościowa | wartość zaakceptowanych wariantów ÷ wartość przedstawionych | gabinet, lekarz | ↑ | plany |
| `plan_open_value` | Wartość planów otwartych | suma `final_price` pozycji `planned`/`scheduled` w zaakceptowanych planach | gabinet, lekarz | neutralna (potencjał) | pozycje |
| `plan_unscheduled_items` | Pozycje bez terminu | pozycje `planned` zaakceptowanych planów bez wizyty | gabinet, lekarz | ↓ | lista „do umówienia” |
| `plan_completion_days` | Czas realizacji planu | mediana dni od akceptacji do `completed` | gabinet | ↓ | plany |

### 4.5 Jakość operacyjna

| id | Nazwa | Definicja | Ziarno | Kierunek | Drążenie |
|---|---|---|---|---|---|
| `lab_late_orders` | Prace lab spóźnione | zlecenia `sent` z `due_at` w przeszłości | gabinet, pracownia | ↓ | zlecenia |
| `lab_risk_next_3d` | Prace lab zagrożone | zlecenia `sent` z wizytą oddania w 3 dni | gabinet | ↓ | zlecenia |
| `wait_time_minutes` | Czas oczekiwania pacjenta | mediana `in_chair_at − lower(period)` dla wizyt z `arrived_at ≤ lower(period)` | gabinet, lekarz | ↓ | wizyty |
| `p1_rejections` (F4) | Odrzucenia P1 | zgłoszenia `rejected` w okresie | gabinet | ↓ | zgłoszenia |
| `documentation_lag_hours` (F4) | Opóźnienie dokumentacji | mediana godzin od `completed_at` do podpisu ostatniego wpisu | lekarz | ↓ | wizyty bez wpisu |

### 4.6 Forma wizualna metryk

Decyzja o formie jest zapisana tu i stąd trafia do kodu ekranu. Kolumna `forma` w `metricRegistry` (`packages/modules/analytics/src/metrics/registry.ts`) przyjmuje wartości: `kafel` (KpiTile ze sparkline), `luk` (ArchGauge), `siatka` (DotGrid), `kropkowy` (DotPlot), `kalendarz` (DotCalendar), `pasek` (PartsBar), `linia` (LineChart), `slupki` (BarList), `lejek` (BarList variant="funnel"), `tabela`. Pole `goodDirection` (`up`, `down`, `neutral`) steruje kolorem pigułki zmiany w kaflu.

| Forma domyślna | Metryki | Uwagi |
|---|---|---|
| `kafel` + `luk` w drążeniu | `chair_utilization`, `provider_utilization`, `confirmation_rate`, `collection_rate`, `plan_acceptance_rate`, `hygiene_reappointment_rate`, `retention_18m` | w kaflu liczba ze sparkline; na karcie „per gabinet” jeden łuk obłożenia na gabinet (16 zębów = 100%), liczba w łuku, `LocationChip` pod spodem |
| `siatka` | `recall_effectiveness`, `new_patients_by_source` (udział), `plan_acceptance_value_rate` | „37 z 50 wróciło na recall”: siatka 10 × N, 1 kuleczka = 1 osoba (do 200) albo 1% |
| `kropkowy` | porównanie gabinetów na pulpicie sieci: `revenue_per_chair_hour`, `no_show_rate`, `avg_ticket`, `lead_time_days`, `wait_time_minutes` | wiersz = miara, kropka = gabinet w kolorze z `color_key`, linia porostu min–max, kreska mediany sieci; zastępuje tabelę z mini-paskami jako widok domyślny (tabela w przełączniku) |
| `kalendarz` | `chair_utilization` w rytmie tygodnia (kwartał), `no_show_rate` wg dnia tygodnia | kolumna = tydzień, wiersz = pn–sb, kolor ze skali zieleni |
| `pasek` | `revenue_by_category`, `receivables_aging`, `lab_cost_ratio` (koszt vs przychód Z5) | segmenty ze skali zieleni, kategoria Z jako próbka kolornika w legendzie |
| `linia` | `revenue_realized`, `collections`, `visits_completed`, `new_patients`, `plan_open_value` w czasie | jedna linia na gabinet w stałym kolorze, etykiety na końcach, linia celu przerywana |
| `slupki` / `lejek` | `plans_presented` → `accepted` → w trakcie → zakończone (`lejek`), `new_patients_by_source` (`slupki`), `provider_fee_accrued` (`slupki`) | słupki poziome, zaokrąglenie 4 px tylko na końcu z danymi |
| `tabela` | `receivables_aging` per pacjent, `lab_late_orders`, `lab_risk_next_3d`, `recall_backlog`, `plan_unscheduled_items`, `schedule_gaps_next_7d`, `patient_debt_count`, `p1_rejections`, `documentation_lag_hours` | listy robocze z działaniem w wierszu |

Każda karta wykresu ma `TableView` niezależnie od formy. Zmiana formy metryki to zmiana w rejestrze i w tym pliku, z zrzutem w PR.

### 4.7 Metryki wydania 1.0 (F0-011)

Siedem metryk liczonych z `fact_chair_capacity`, `fact_chair_occupancy` i `fact_day_closures` (`03a`, 12.1). Każda ma `since: '1.0'`; dwie (`chair_utilization`, `revenue_realized`) zmienią źródło w kolejnych wydaniach bez zmiany `id` i definicji słownej.

| id | Nazwa | Definicja w 1.0 | Ziarno | Kierunek | Forma | Drążenie |
|---|---|---|---|---|---|---|
| `chair_utilization` | Obłożenie foteli | minuty wpisów ÷ dostępne minuty (4.2) | gabinet, fotel, wykonawca, dzień | ↑ | `kafel` + `luk` per gabinet | wpisy (licznik) i pojemność per dzień (mianownik) |
| `chair_hours_worked` | Godziny pracy foteli | suma minut wpisów ÷ 60 | gabinet, fotel, wykonawca, kategoria, dzień | ↑ | `kafel`, `slupki` per fotel | wpisy |
| `revenue_realized` | Przychód zrealizowany | suma kwot z wpisów (4.1) | gabinet, wykonawca, kategoria, dzień | ↑ | `kafel`, `linia` tygodniowo per gabinet | wpisy z kwotą |
| `revenue_per_chair_hour` | Przychód na godzinę fotela | `revenue_realized` ÷ `chair_hours_worked` (godziny z kwotą i bez) | gabinet, fotel, wykonawca | ↑ | `kafel`, `kropkowy` (porównanie gabinetów) | wpisy |
| `revenue_by_category` | Przychód wg kategorii | `revenue_realized` w podziale Z1–Z+ | gabinet, kategoria | neutralna | `pasek` | wpisy kategorii |
| `provider_hours_worked` | Godziny wykonawców | suma minut wpisów per wykonawca ÷ 60 | gabinet, wykonawca, kategoria | neutralna | `slupki`, w pulpicie lekarza `kafel` | wpisy wykonawcy |
| `days_closed_rate` | Dni zamknięte | dni robocze gabinetu z zamknięciem ÷ dni robocze w okresie (jakość danych) | gabinet | ↑ (cel 100%) | `kafel`, `kalendarz` | dni bez zamknięcia (link do `/oblozenie`) |

Czego w 1.0 celowo nie ma: nieobecności, konwersji planów, nowych pacjentów, ściągalności. Pojawiają się z wydaniami, w których powstają ich źródła (1.1 wizyty, 2.0 plany i należności). Kafel bez źródła nie jest pokazywany jako „wkrótce”.

## 5. Układy pulpitów

### 5.1 Dziś (recepcja)
- Nagłówek: data, „teraz”, przełącznik gabinetu (recepcja sieci widzi wszystkie kolumny).
- Kafle (4): wizyty dziś, zakończone, nieobecności, plan przychodu dnia (suma cen planowanych usług).
- Siatka dnia: kolumny = fotele (z chipem gabinetu), bloki w kolorach kolornika, pasek 4 px w kolorze krawędzi kategorii, status ikoną i słowem, wskaźnik „teraz” bursztynowy. Kliknięcie bloku: panel boczny (pacjent, telefon, usługi, saldo, przyciski: przyszedł, na fotelu, zakończ, przesuń, SMS).
- Prawa kolumna (zwijana): lista oczekujących do luk dnia, prace lab na dziś/jutro, niepotwierdzone wizyty jutro z przyciskiem „zadzwoń”.
- Skróty: `Ctrl+K` pacjent, `N` nowa wizyta, `T` dziś, `←/→` dzień.

### 5.2 Przegląd 60 sekund (odprawa poranna)
Jedna strona do przeczytania na głos w zespole:
1. Luki dziś i jutro (lista slotów ≥ 30 min z sugestią z listy oczekujących).
2. Wczoraj: nieobecności i późne odwołania (nazwiska, bo to własny gabinet) do kontaktu.
3. Prace lab: co ma wrócić dziś/jutro i co nie wróciło.
4. Pacjenci dnia z saldem ujemnym lub bez podpisanej zgody na dzisiejszy zabieg.
5. Recall zaległy w tym tygodniu (liczba + 5 pierwszych do zadzwonienia).
6. Jedna liczba motywacyjna: obłożenie tygodnia vs cel gabinetu.

### 5.3 Pulpit gabinetu (kierownik)
- Wiersz filtrów (okres, porównanie, lekarz, kategoria).
- Kafle (6 na ≥ 1440 px, 4 poniżej): `revenue_realized`, `chair_utilization`, `no_show_rate`, `plan_acceptance_rate`, `new_patients`, `avg_ticket`; każdy z deltą ze słowem i sparkline 12 tygodni (anatomia: `06`, 4.1).
- Wykres główny (cała szerokość): przychód tygodniowo, linia gabinetu + linia celu przerywana, etykieta na końcu linii.
- Siatka 2 × N: obłożenie foteli jako łuk obłożenia (jeden łuk, liczba w środku, pod spodem kalendarz kuleczek dni tygodnia) | lejek planów (przedstawione → zaakceptowane → w trakcie → zakończone) z wartością planów otwartych.
- Dalej: przychód wg kategorii (pasek części z próbką kolornika w legendzie) | skuteczność recall jako siatka kuleczek („37 z 50”) | recall do wykonania (lista) | laboratorium (lista).
- Wiersz 4: tabela wykonawców gabinetu (przychód, godziny, przychód/h, obłożenie, nieobecności, konwersja) z sortowaniem; mediana gabinetu jako wiersz odniesienia.
- Wiersz 5: należności wg wieku + pacjenci z saldem (tylko kierownik).

### 5.4 Pulpit lekarza
- Kafle: mój przychód, moje obłożenie, moja konwersja planów, moja średnia wizyta, moje nieobecności, narastające wynagrodzenie (wg umowy).
- Każdy kafel ma drugą liczbę „mediana sieci” bez nazwisk innych lekarzy. Żadnych rankingów imiennych (decyzja: rankingi widzi tylko zarząd; `08`, wzorzec Scorecards przyjęty z ograniczeniem).
- Lista: moje plany do domknięcia (pozycje bez terminu), moi pacjenci bez wizyty kontrolnej po Z4, moje wpisy niepodpisane (F4).

### 5.5 Pulpit sieci (zarząd)
- Wiersz filtrów pełny.
- Kafle (6 na ≥ 1440 px, 4 poniżej) jak w gabinecie, ale dla sieci, z deltą do poprzedniego okresu lub celu.
- Wykres główny (cała szerokość): przychód tygodniowo, jedna linia na gabinet w stałym kolorze (01 Nowodworska zieleń, 02 Białowieska niebieski, 03 ochra, 04 terakota), etykiety przy końcach linii, legenda z `LocationChip`, przełącznik tabela.
- Siatka 2 × N, pierwszy rząd: obłożenie foteli per gabinet jako łuki obłożenia obok siebie (liczba w łuku, chip gabinetu pod spodem) | porównanie gabinetów jako wykres kropkowy (wiersze: przychód/h fotela, nieobecności, średnia wizyta, czas do terminu, czas oczekiwania; kropki w kolorach gabinetów, linia porostu min–max, kreska mediany sieci); tabela z wierszem na gabinet w przełączniku „Tabela”, kliknięcie w liczbę = drążenie.
- Lejek planów sieci + „Wartość planów otwartych” + „Pozycje bez terminu” (link do listy per gabinet).
- Źródła nowych pacjentów (słupki) z kosztem pozyskania, jeśli wpisany (F3, ręcznie per źródło).
- Rankingi wykonawców (tylko tu): górne i dolne 20% wg przychodu/h i konwersji, z kontekstem (godziny grafiku), bez kolorów alarmowych.
- Stopka: „dane odświeżone o 13:05, pełne przeliczenie nocne 02:10”, link do definicji metryk.

### 5.6 Koniec dnia (raport automatyczny)
E-mail/Teams o 21:00 dla zarządu i kierowników: tabela gabinetów (wizyty, nieobecności, przychód zrealizowany, wpływy, nowi pacjenci, plany przedstawione/zaakceptowane), 3 zdania generowane deterministycznie (bez LLM) typu „Gabinet 02: obłożenie 71%, 2 nieobecności, przychód 11 850 zł (+8% vs średnia środy)”, link do pulpitu z filtrami dnia. Bez nazwisk pacjentów.

### 5.7 Pulpity wydania 1.0 (F0-011)

Trzy pulpity na metrykach z 4.7, z tym samym `FilterBar` (okres, porównanie, gabinet, wykonawca, kategoria):

- **Pulpit sieci 1.0** (`/pulpit`, `analytics.view_network`): rząd kafli `chair_utilization`, `chair_hours_worked`, `revenue_realized`, `revenue_per_chair_hour` (na ≥ 1440 px także `days_closed_rate`, `provider_hours_worked`); wykres główny: `revenue_realized` tygodniowo, linia per gabinet w kolorze z `color_key`, linia celu z `analytics.targets.*`, gdy ustawiona; siatka 2 × N: łuki obłożenia per gabinet · porównanie gabinetów jako wykres kropkowy (obłożenie, przychód/h, godziny, dni zamknięte) · struktura przychodu wg kategorii (pasek części) · rytm tygodnia (kalendarz kuleczek obłożenia per dzień) · godziny per fotel (słupki) · jakość danych (lista dni niezamkniętych z linkiem do siatki dnia). Stopka: `refreshed_at`.
- **Pulpit gabinetu 1.0** (`/pulpit/gabinet`, `analytics.view_location`, kierownik zablokowany na swój gabinet): te same karty dla jednego gabinetu plus tabela wykonawców (godziny, kwota, kwota/h; bez porównań imiennych między gabinetami).
- **Pulpit „moje” 1.0** (`/pulpit/moje`, `analytics.view_self`): moje godziny, moja kwota, moja kwota/h z drugą liczbą „mediana gabinetu” bez nazwisk; kalendarz kuleczek moich dni; lista moich wpisów bez kwot innych osób.
- **Lista drążenia** (`/lista/oblozenie?metric=<id>&…`): zakładki „w liczniku” / „w mianowniku”, suma kontrolna równa kaflowi, CSV z `analytics.export`.

Od 1.1 pulpity rosną o metryki wizyt (5.3–5.5); układ i filtry zostają.

## 6. Drążenie: kontrakt

- Każdy kafel, słupek i komórka tabeli ma `href` do listy rekordów: `/lista/<encja>?metric=<id>&<filtry>` (np. `/lista/wizyty?metric=no_show_rate&okres=30d&gabinet=01`).
- Lista pokazuje dokładnie rekordy wchodzące do licznika i mianownika (zakładki „w liczniku” / „w mianowniku”) i sumę kontrolną zgodną z kaflem. To jest test akceptacyjny każdej metryki (`[F3-001/AC4]`).
- Uprawnienia listy = uprawnienia metryki; dane osobowe pojawiają się tylko na poziomie gabinetu i niżej (sieć widzi tylko numery kart, chyba że użytkownik ma członkostwo w tym gabinecie).

## 7. Cele i alerty

- Cele per gabinet i okres w `platform.settings` (`targets.revenue_monthly`, `targets.chair_utilization`, `targets.no_show_rate`…), edytowane przez zarząd. Porównanie `porownaj=cel`.
- Alerty (worker, codziennie 7:30, na ekranie „Dziś” i w raporcie): nieobecności tygodnia > 1,5 × mediana 12 tygodni; luki jutro > 3 h na gabinet; recall zaległy > 50; prace lab zagrożone > 0; wpisy niepodpisane > 24 h (F4); odrzucenia P1 > 0 (F4). Alert to wiersz z ikoną, tekstem i jednym działaniem. Bez dźwięków i czerwonych pasków.

## 8. Odświeżanie i wydajność

- `analytics` zasilane przyrostowo co 5 min dla ostatnich 2 dni, nocą pełne 13 miesięcy; „Dziś” czyta z tabel operacyjnych (dane na żywo), reszta z `analytics`.
- Budżety: pulpit < 1,5 s p95 przy 13 miesiącach danych 4 gabinetów; każde zapytanie metryki < 200 ms (indeksy po `tenant_id, location_id, date_key`).
- Cache per użytkownik na 60 s w warstwie serwera (klucz: tenant, rola, filtry); brak cache między użytkownikami (ADR-030).

## 9. Wygląd (skrót z `06`)

- Forma według sekcji 4.6: łuk obłożenia i siatka kuleczek dla wartości z naturalnym 100%, wykres kropkowy dla porównań gabinetów, pasek części dla struktury sumy, linia dla trendów, słupki poziome i lejek dla rankingów i planów, tabela dla list roboczych; **bez** wykresów kołowych, pierścieniowych, dwuosiowych i 3D.
- Gabinety w stałych kolorach z `color_key` (01 Nowodworska `#2F7D45`, 02 Białowieska `#3A76AC`); miary jednej wielkości w skali zieleni `--dane-skala-1…7`; kategorie usług jako próbka kolornika przy etykiecie, słupek zostaje zielony; bursztyn nigdy w danych.
- Liczby tabelaryczne w polskim formacie (`1 234,50 zł`, `82%`, `14.02.2027`), `zł` i `%` w nagłówkach; delty jako „▲ 4 pp r/r” lub „▼ 3,4%” ze strzałką i słowem, kolor według znaczenia (`goodDirection`); sparkline 12 tygodni z kropką końcową w kaflu.
- Tooltip przy najechaniu i fokusie z klawiatury; wartość pogrubiona przed nazwą serii; przełącznik „Wykres / Tabela” na każdej karcie.
- Stany: ładowanie (poprzedni stan przyciemniony), pusto („Brak wizyt w tym okresie. Zmień okres lub gabinet.”), błąd z działaniem, brak uprawnień.
- Eksport: CSV każdej listy i tabeli, PDF pulpitu w szacie marki (A4 poziomo) dla zarządu.

## 10. Kryteria akceptacji dla F3-001 (skrót; pełna spec w `specs/F3-001-pulpit-sieci.md`)

1. Każda metryka z rejestru ma test na zestawie wzorcowym i zgodność drążenia (suma listy = kafel).
2. Zmiana filtra w URL przeładowuje wszystkie karty i daje się wysłać linkiem.
3. Lekarz zalogowany na pulpit lekarza nie widzi danych innych lekarzy (test RLS i e2e).
4. Pulpit sieci dla 13 miesięcy i 4 gabinetów renderuje się poniżej 1,5 s p95 na stagingu z danymi syntetycznymi.
5. Każdy wykres ma widok tabeli i działa z klawiatury (fokus na punktach, strzałki).
6. Raport „Koniec dnia” nie zawiera nazwisk pacjentów (test na szablonie).
