# 7 · Analityka i pulpity 1.0

Specyfikacja: `docs/specs/F0-011-pulpit-1-0.md`. Rejestr metryk: `docs/11`, sekcje 4.6–4.7, układy 5.7. Prompty: K13 (schemat, zasilanie, rejestr), K14 (pulpity, lista drążenia).

## 7.1 Droga liczby: od komórki w siatce do kafla

{{rysunek:analityka}}

1. Recepcja zapisuje wpis → wiersz w `chair_occupancy` + zdarzenie `occupancy.entry_recorded.v1` w outboxie (ta sama transakcja).
2. Worker odbiera zdarzenie i zleca `analytics.refresh` dla gabinetu i dnia (a niezależnie co 5 minut przelicza ostatnie 48 h; nocą 13 miesięcy).
3. Refresh pisze `fact_chair_capacity` (mianownik) i `fact_chair_occupancy` (licznik), `fact_day_closures`, i wpis w `refresh_log`.
4. Rejestr metryk (`metrics/registry.ts`) ma dla każdej metryki SQL na faktach; `runMetric(id, filtry, aktor)` wykonuje go z walidacją filtrów wg roli i cache 60 s.
5. Pulpit renderuje kafel w formie z rejestru (`forma`), z deltą i linkiem do `/lista/oblozenie?metric=…`, gdzie suma rekordów jest równa kaflowi (AC4).

## 7.2 Siedem metryk 1.0

| id | Nazwa | Definicja w 1.0 | Forma | Kierunek |
|---|---|---|---|---|
| `chair_utilization` | Obłożenie foteli | minuty nieunieważnionych wpisów ÷ dostępne minuty foteli (godziny otwarcia z wyjątkami minus blokady) | kafel + łuk obłożenia per gabinet | ↑ |
| `chair_hours_worked` | Godziny pracy foteli | suma minut wpisów ÷ 60 | kafel, słupki per fotel | ↑ |
| `revenue_realized` | Przychód zrealizowany | suma kwot z wpisów (`since: 1.0`; od 2.0 z należności, bez zmiany `id`) | kafel, linia tygodniowo per gabinet | ↑ |
| `revenue_per_chair_hour` | Przychód na godzinę fotela | `revenue_realized` ÷ `chair_hours_worked` (wszystkie godziny); kafel pokazuje odsetek godzin z kwotą | kafel, wykres kropkowy | ↑ |
| `revenue_by_category` | Przychód wg kategorii | podział Z1–Z+ | pasek części | neutralna |
| `provider_hours_worked` | Godziny wykonawców | minuty wpisów per wykonawca ÷ 60 | słupki; w pulpicie „moje” kafel | neutralna |
| `days_closed_rate` | Dni zamknięte | dni robocze z zamknięciem ÷ dni robocze w okresie | kafel, kalendarz kuleczek | ↑ (cel 100%) |

Czego w 1.0 celowo nie ma: nieobecności, konwersji planów, nowych pacjentów, ściągalności. Pojawiają się z wydaniami, w których powstają ich źródła. Kafel bez źródła nie jest pokazywany jako „wkrótce”.

## 7.3 Filtry: jeden wiersz rządzi wszystkim

Kontrakt URL (`docs/11`, sekcja 3): `okres` (`7d`, `30d`, `kw`, `od=…&do=…`), `porownaj` (`poprzedni`, `rok_temu`, `cel`, `brak`), `gabinet` (`all`, `01`, `02`), `wykonawca`, `kategoria` (`Z1`…`Z+`), `widok` (`wykres`/`tabela`, per karta). Zasady:

- filtry zapisują się w URL, więc link odtwarza widok (AC2); ostatnio użyte w `localStorage` per użytkownik;
- niedozwolone kombinacje są ignorowane już po stronie serwera: lekarz nie ustawi `wykonawca=inny`, kierownik nie ustawi cudzego gabinetu (AC3);
- zmiana filtra przeładowuje wszystkie karty ze stanem przyciemnienia, bez pustych migotań.

## 7.4 Trzy pulpity

{{makieta:pulpit}}

| Pulpit | Dla kogo | Układ |
|---|---|---|
| `/pulpit` (sieć) | zarząd (`analytics.view_network`) | rząd kafli: obłożenie, godziny, przychód, przychód/h (na ≥ 1440 px także dni zamknięte i godziny wykonawców); wykres główny: przychód tygodniowo per gabinet z linią celu; siatka 2 × N: łuki obłożenia per gabinet, wykres kropkowy porównania (obłożenie, przychód/h, godziny, dni zamknięte), pasek części wg kategorii, kalendarz kuleczek rytmu tygodnia, słupki godzin per fotel, jakość danych (dni niezamknięte z linkiem) |
| `/pulpit/gabinet` | kierownik (`analytics.view_location`), zablokowany na swój gabinet | te same karty dla jednego gabinetu + tabela wykonawców (godziny, kwota, kwota/h) |
| `/pulpit/moje` | lekarz, higienistka (`analytics.view_self`) | moje godziny, moja kwota, moja kwota/h z medianą gabinetu bez nazwisk; kalendarz kuleczek moich dni; lista moich wpisów |

Anatomia kafla (`docs/06`, 4.1): etykieta 12 px, liczba 30–32 px tabular z jednostką, sparkline z kropką po prawej, pigułka zmiany ze strzałką i słowem w kolorze według **znaczenia** (`goodDirection`). Anatomia karty (`docs/06`, 4.2): tytuł mówi, co widać („Obłożenie foteli: 01 nad celem, 02 poniżej”), podpowiedź z definicją, legenda z chipami gabinetów, przełącznik Wykres/Tabela, stopka z zakresem i `refreshed_at`.

## 7.5 Drążenie: każda liczba na ekranie ma dowód

Każdy kafel, słupek i kropka ma `href` do `/lista/oblozenie?metric=<id>&<filtry>`. Lista pokazuje dokładnie rekordy wchodzące do licznika i mianownika (zakładki „w liczniku” / „w mianowniku”; dla `chair_utilization`: wpisy i pojemność per fotel i dzień) i sumę kontrolną równą kaflowi. To jest test akceptacyjny każdej metryki (`[F0-011/AC4]`). CSV z `analytics.export` zostawia wpis w audycie.

## 7.6 Cele i porównania

`analytics.targets.<metric>` per gabinet i miesiąc w `platform.settings` (edycja w Ustawienia → System). `porownaj=cel` zmienia deltę na kaflach (różnica do celu ze strzałką i słowem) i rysuje szarą przerywaną linię „cel” na wykresie głównym (AC9). Propozycja na start: obłożenie 01 → 75%, 02 → 65%; korekta po pierwszym miesiącu pomiaru.

## 7.7 Odświeżanie i wydajność

- przyrostowo co 5 minut (ostatnie 48 h; upsert po kluczu naturalnym), pełne 02:10 dla 13 miesięcy; idempotentne (dwa uruchomienia = ten sam wynik, AC5);
- `refreshed_at` w stopce każdego pulpitu; `refresh_log` z oknem, czasem i liczbą wierszy;
- budżet: pulpit < 1,5 s p95, zapytanie metryki < 200 ms (indeksy `tenant_id, location_id, date_key`; AC6);
- cache 60 s per (tenant, rola, filtry), nigdy między użytkownikami (ADR-030).

## 7.8 Jak dodać metrykę (procedura)

1. `pnpm gen metric <id>`: szkielet `metrics/<id>.ts`, test na zestawie wzorcowym, wiersz do `docs/11`.
2. Uzupełnij definicję słowną, SQL, `goodDirection`, `forma`, `drilldown`, uprawnienie.
3. Dopisz oczekiwaną wartość do `golden/expected.json` policzoną niezależnie (`golden/verify.sql`).
4. Wiersz w `docs/11`, sekcja 4 (albo 4.7 dla 1.0). Bez wiersza `crux-doctor` (`analytics.metric-registered`) jest czerwony.
5. Kafel na pulpicie przez konfigurację w formie z rejestru; `ui.metric-form` sprawdza zgodność.
