# Prompty implementacyjne Crux

Wersja 1.1 · 6 listopada 2026. Gotowe prompty do wklejenia w Cursorze, w kolejności wykonania. Prompt (`K01`, `K02`…; K jak krok planu) to jeden czat w Cursorze; prompt może mieć części (`Część 1/4`…), a każda część to jeden commit i jeden wpis w `ledger.md`. Plik `F0-fundament.md` to całe wydanie 1.0 „Krasnodrzew” (K01–K17); kolejne pliki to kolejne wydania (`docs/07`, sekcja 2). Prompty zakładają, że repo ma w katalogu głównym `AGENTS.md`, `.cursor/rules/`, `docs/`, `prompts/` i `podrecznik/` z tego folderu (kopiujemy je w K01).

## Jak używać

1. **Czytaj kolejno.** Pliki faz = wydań: `F0-fundament.md` (1.0), `F1-pacjenci-terminarz.md` (1.1), `F2-plany-finanse.md` (2.0), `F3-crm-dashboardy.md` (2.1), `F4-dokumentacja-p1.md` (3.0), `F5-obrazowanie.md` (4.0). Numeracja `K01`, `K02`… w obrębie fazy; części w prompcie oznaczone `Część 1/4` itd. „P1” w promptach oznacza Platformę P1 (e-zdrowie).
2. **Tryb Plan najpierw.** Każdy prompt wklejasz najpierw w trybie Plan (Cursor pokazuje plan plików). Czytasz plan 2 minuty. Jeśli plan proponuje coś spoza zakresu albo spoza `03a`, odrzucasz i doprecyzowujesz. Dopiero potem tryb Agent z tym samym promptem i dopiskiem „Realizuj plan”.
3. **Jeden prompt na czat.** Nowy czat na każdy prompt (kontekst czysty, reguły z `.cursor/rules` ładują się same). W pierwszej linii czatu zawsze: `@AGENTS.md @prompts/ledger.md` (ostatnie wpisy) plus pliki wymienione w sekcji „Przeczytaj”.
4. **Definicja ukończenia** jest w każdym prompcie. Zanim przejdziesz dalej: komendy z sekcji „Sprawdzenie” są zielone, diff przeczytany, wpis w `ledger.md` dopisany, commit z Conventional Commits.
5. **Jeśli Cursor zatrzyma się z pytaniem** (prompty mówią mu, kiedy ma się zatrzymać): odpowiedz w tym samym czacie, zapisz odpowiedź jako decyzję (ADR, jeśli dotyczy zasady; komentarz w specyfikacji, jeśli dotyczy funkcji).
6. **Przegląd adwersarialny** (`docs/10`, 3.5) po każdym prompcie z etykietą `security`, `money`, `clinical` oraz po ostatnim kroku każdego modułu.
7. **Nie przeskakuj.** Prompty zależą od poprzednich (np. `withActor` z F0-K04 jest używany wszędzie). Jeśli musisz coś pominąć, zapisz to w `ledger.md` jako dług.

## Struktura promptu

```
### K0X · Tytuł  [etykiety]
**Cel.** jedno zdanie.
**Przeczytaj.** lista plików @.
**Zakres.** co wolno dotknąć; czego nie wolno.
**Kroki.** numerowane; każdy kończy się testem.
**Ograniczenia.** zasady specyficzne dla tego kroku.
**Sprawdzenie.** komendy, które muszą przejść.
**Zatrzymaj się, gdy.** sytuacje wymagające decyzji człowieka.
```

Prompt jest napisany do modelu w drugiej osobie, po polsku; nazwy w kodzie po angielsku (ADR-018). Możesz go skrócić, ale nie usuwaj sekcji „Ograniczenia” i „Zatrzymaj się, gdy”: to one chronią system.

## Generowanie nowych promptów

Prompty dla funkcji spoza tego folderu generuje czat w projekcie Claude z szablonów w `docs/10-praca-z-ai.md` (sekcja 3) na podstawie specyfikacji z `docs/specs/`. Nowy prompt dopisujemy do pliku fazy, żeby `ledger.md` miał do czego się odwołać.
