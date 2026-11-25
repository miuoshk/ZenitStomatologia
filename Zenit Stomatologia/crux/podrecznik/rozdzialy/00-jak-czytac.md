# Podręcznik Crux · wydanie 1.0 „Krasnodrzew”

Wersja 1.0 · 6 listopada 2026 · dla Miłosza (product owner i architekt), programisty od 1.1 i każdego, kto chce zrozumieć system bez zgadywania.

Ten podręcznik jest **generowany** z folderu `crux` (`podrecznik/build.py`): rozdziały 1–10 i 12–14 są napisane ręcznie w `podrecznik/rozdzialy/`, rozdział 11 zawiera pełny tekst promptów wklejony automatycznie z `prompts/F0-fundament.md`, rysunki pochodzą z `podrecznik/rysunki/*.mmd`, a makiety z `manifest/makiety/`. Gdy zmieniasz prompt albo rysunek, uruchamiasz `python3 podrecznik/build.py` i podręcznik jest znowu aktualny. Dzięki temu nie ma dwóch wersji prawdy.

## Jak czytać

| Jeśli masz | Czytaj |
|---|---|
| 10 minut | rozdział 1 (po co), rozdział 2 (co dostajemy w 1.0), rozdział 9 (stan prac) |
| godzinę przed pierwszym promptem | rozdziały 3–7 (architektura, dane, dostępy, obłożenie, analityka), potem 10 (plan) |
| Cursor otwarty i chcesz pracować | rozdział 10 (jak wykonać krok), rozdział 11 (prompty K01–K17), rozdział 13 (procedury), ledger |
| pytanie „gdzie to jest w dokumentacji” | rozdział 14 (mapa plików i słownik) |

Zasada tego podręcznika: **nic nie trzeba się domyślać**. Każda nazwa pliku, tabeli, uprawnienia i kroku jest dokładnie tą, która trafi do repo. Gdy podręcznik i plik w `docs/` mówią co innego, wygrywa `docs/` (podręcznik jest widokiem na `docs/`), a różnicę naprawiamy w tym samym dniu.

## Konwencje zapisu

- `K07` to prompt (jeden czat w Cursorze) z `prompts/F0-fundament.md`; „Część 2/4” to commit w obrębie promptu.
- `F0-010` to specyfikacja z `docs/specs/`; `AC5` to jej piąte kryterium akceptacji; w testach pojawia się jako `[F0-010/AC5]`.
- `01 Nowodworska` i `02 Białowieska` to gabinety; numer jest stały, kolor danych też (zieleń, niebieski).
- „Platforma P1” to system e-zdrowia (CeZ). Gdy w rozmowie mówimy „P1” o Cruxie, chodzi o wydanie 1.0.
- Ścieżki są względem katalogu repo (`apps/web`, `packages/modules/scheduling`) albo folderu `crux` z dokumentacją (`docs/03a`, `prompts/`).
- Daty w planie są z `docs/07`; jeśli coś się przesunie, zmieniamy `07` i generujemy podręcznik ponownie.
