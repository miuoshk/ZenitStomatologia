# Recepcja: wpisanie obłożenia dnia (≈ 2 minuty)

**Dla:** recepcja gabinetów 01 Nowodworska i 02 Białowieska · **Wersja:** 1.0 „Krasnodrzew” · **Szkolenie:** 15 minut per gabinet (lista obecności: [docs/ops](../ops/lista-obecnosci-szkolenie-1-0.md)).

W Crux 1.0 wpisujesz **godziny pracy foteli**, nie pacjentów. Nie wpisuj imion, nazwisk, telefonów ani PESEL-i (ani w notatce): system tego nie przyjmie.

> Zrzuty ekranu: `docs/instrukcje/img/` (do dodania przed wydrukiem: `01-logowanie.png`, `02-mfa.png`, `03-siatka.png`, `04-edytor-wpisu.png`, `05-zamknij-dzien.png`).

## 1. Logowanie i MFA

1. Wejdź na adres Crux (`crux.zenitstomatologia.pl`) i zaloguj się **swoim** kontem (konto jest imienne; nie wolno logować się na cudzym ani udostępniać hasła).
2. Przy pierwszym logowaniu wpisz hasło jednorazowe od administratora i ustaw własne.
3. Zeskanuj kod QR aplikacją uwierzytelniającą (TOTP) i wpisz 6-cyfrowy kod. Przy każdym kolejnym logowaniu podajesz kod z aplikacji.
4. Po 5 minutach bezczynności ekran się blokuje: wpisz hasło, żeby wrócić.

## 2. Siatka dnia

Menu **Obłożenie**. Kolumny to fotele gabinetu, wiersze to godziny otwarcia (pon.–pt. 8–20, sob. 8–14). Wybierz gabinet i dzień (**Dziś**, strzałki dnia, pole **Dzień**). Zablokowany fotel (serwis) i godziny poza otwarciem są oznaczone i nie liczą się do pojemności.

## 3. Wpis z klawiatury

| Klawisz | Działanie |
|---|---|
| **← ↑ → ↓** | ruch po siatce |
| **Enter** | otwiera edytor wpisu (wykonawca, kategoria, kwota opcjonalnie), **Enter** zapisuje |
| **1–6** | kategoria usługi Z1, Z2, Z3, Z4, Z5, Z+ |
| **Shift + strzałka** | zaznacza zakres godzin (jeden wpis na kilka godzin) |
| **Backspace** | anuluje wpis (wymaga powodu) |
| **Esc** | zamyka edytor bez zapisu |

Kwota jest opcjonalna (np. `450` lub `450,00`); jeśli ją znasz, wpisz: pulpit zarządu pokaże przychód.

## 4. „Dzień jak wczoraj”

Przycisk **Dzień jak…** kopiuje wpisy z wybranego dnia (domyślnie poprzedniego dnia kalendarzowego; zmień datę, jeśli wczoraj było zamknięte) na bieżący. Poprawiasz tylko różnice. System poda, ile wpisów skopiował i ile pominął (np. fotel zablokowany).

## 5. Zamknij dzień

Na koniec pracy kliknij **Zamknij dzień**: to potwierdza, że wpisy są kompletne. Zarząd liczy na zamknięte dni (cel: co najmniej 90% dni roboczych).

## 6. Pomyłka

- **Dzień otwarty:** wybierz wpis, **Backspace** (lub **Anuluj wpis**), wpisz powód i zatwierdź; potem wpisz poprawnie. Wpis nie znika z historii, tylko jest unieważniony.
- **Dzień zamknięty:** nie edytujesz. Poproś **kierownika gabinetu** o ponowne otwarcie dnia (z powodem) lub o poprawkę.
- **„Ta godzina na fotelu ma już wpis”:** popraw istniejący wpis albo wybierz inną godzinę.
- **Poza godzinami otwarcia:** wpis jest możliwy tylko z powodem (uprawnienie kierownika).

W razie kłopotów: administrator sieci (Miłosz, Bartek).
