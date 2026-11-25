# Zarząd i kierownicy: pulpit

**Dla:** administratorzy sieci, kierownicy gabinetów · **Wersja:** 1.0 „Krasnodrzew” · definicje liczb: [docs/11, sekcja 4.7](../11-dashboardy-i-raporty.md).

> Zrzuty ekranu: `docs/instrukcje/img/` (do dodania: `10-pulpit-siec.png`, `11-filtry.png`, `12-drazenie.png`, `13-ustawienia-system.png`).

## 1. Gdzie

- **Pulpit** (`/pulpit`): sieć, wszystkie gabinety obok siebie (administrator sieci).
- **Pulpit gabinetu** (`/pulpit/gabinet`): jeden gabinet (kierownik).
- **Moje liczby** (`/pulpit/moje`): własne godziny i kwoty wykonawcy. Porównanie z medianą gabinetu jest w 1.0 tylko zapowiedzią.

## 2. Filtry

Pasek u góry: **Okres** (dziś, 7 dni, 30 dni, od początku miesiąca/tygodnia/roku, własny zakres), **Porównaj z** (poprzedni okres, rok temu, cel, mediana sieci), **Gabinet**, **Wykonawca**, **Kategoria** (Z1–Z+). Filtry są w adresie strony, więc można go wysłać koledze. **Wyczyść filtry** wraca do ustawień domyślnych.

## 3. Co znaczą liczby

Wszystkie liczą się z wpisów obłożenia recepcji (nie z wizyt: tych w 1.0 nie ma). Pełne definicje: [docs/11, sekcja 4.7](../11-dashboardy-i-raporty.md).

| Kafel | Znaczenie w skrócie |
|---|---|
| Obłożenie foteli | minuty wpisów ÷ dostępne minuty (godziny otwarcia minus blokady) |
| Godziny pracy foteli | suma godzin wpisów |
| Przychód zrealizowany | suma kwot wpisanych przez recepcję; **tylko godziny z kwotą**, więc może być niższy od faktycznego |
| Przychód na godzinę fotela | przychód ÷ godziny pracy (także godziny bez kwoty) |
| Struktura przychodu | udział kategorii Z1–Z+ |
| Godziny wykonawców | godziny per wykonawca |
| Dni zamknięte | dni robocze z zamknięciem ÷ dni robocze (jakość danych; cel 100%) |

**Uwaga o jakości:** jeśli „Dni zamknięte” jest niskie, pozostałe liczby są niepełne. Karta **Jakość danych** wskazuje dni bez zamknięcia (z linkiem do `/oblozenie`). Pod pulpitem widać godzinę ostatniego odświeżenia (dane odświeżają się co kilka minut).

## 4. Drążenie

Kliknij kafel, aby zobaczyć **listę obłożenia** za tą liczbą: zakładki **W liczniku**, **W mianowniku**, **Dni bez zamknięcia**. Pod tabelą jest **suma kontrolna** z oznaczeniem „zgodne z kafelkiem”: jeśli widzisz „niezgodne”, zgłoś to administratorowi.

## 5. Eksport CSV

Na liście drążenia: **Pobierz CSV** (zawiera wszystkie wiersze, także gdy ekran pokazuje pierwsze). Plik zawiera dane obłożenia bez danych pacjentów; traktuj go jak dokument wewnętrzny i nie wysyłaj poza firmę.

## 6. Cele

Cel obłożenia (domyślnie 75% dla 01 Nowodworska i 65% dla 02 Białowieska) ustawia administrator w **Ustawienia → System** (ustawienia gabinetów). Cele po miesiącu pracy zostaną skorygowane na podstawie rzeczywistych danych.
