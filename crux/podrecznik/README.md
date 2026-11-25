# Podręcznik Crux · wydanie 1.0 „Krasnodrzew”

Jeden dokument, który tłumaczy cały system bez domyślania się: po co, co wchodzi do 1.0, architektura w obrazkach, baza, dostępy, moduł wzorcowy (obłożenie foteli), analityka i pulpity, marka w aplikacji, stan prac, plan krok po kroku, pełny tekst promptów K01–K17 dla Cursora, wdrożenie, procedury, słownik.

| Plik | Co to jest |
|---|---|
| `PODRECZNIK-CRUX-1.0.pdf` | wersja do czytania i druku (A4, ok. 57 stron, numeracja stron, wektorowe rysunki) |
| `PODRECZNIK-CRUX-1.0.html` | ta sama treść w jednym pliku HTML (czcionki, rysunki i makiety wbudowane) |
| `PODRECZNIK-CRUX-1.0.md` | ta sama treść w Markdown: do czytania w Cursorze i do `@`-odwołań w promptach (`@podrecznik/PODRECZNIK-CRUX-1.0.md`) |
| `rozdzialy/00…14-*.md` | źródło: rozdziały pisane ręcznie; rozdział 11 ma tylko znacznik `{{prompty:F0}}` |
| `rysunki/*.mmd`, `*.svg` | rysunki w Mermaid (źródło) i wyrenderowane SVG; `mermaid-config.json` to motyw marki |
| `build.py` | składa wszystko w trzy pliki wynikowe |

## Zasada: jedno źródło prawdy

Prompty są wklejane do podręcznika automatycznie z `prompts/F0-fundament.md`, makiety z `manifest/makiety/`, rysunki z `rysunki/`. Zmieniasz źródło, budujesz ponownie, nie poprawiasz plików wynikowych ręcznie.

```
cd crux
python3 podrecznik/build.py            # .md + .html zawsze; .pdf, gdy jest node z Playwright i Chromium
python3 podrecznik/build.py --no-pdf
```

Wymagania: `python3` z pakietem `markdown` (`pip install markdown`); do SVG `mmdc` (`npm i -g @mermaid-js/mermaid-cli`); do PDF `node` z `playwright` i Chromium (`npx playwright install chromium`). Bez `mmdc` plik `.md` i tak ma bloki ```mermaid, które Cursor i GitHub renderują same; bez Playwright powstają `.md` i `.html`.

## Kiedy budować ponownie

- po każdej zmianie promptu w `prompts/F0-fundament.md`;
- po zmianie planu w `docs/07` (rozdział 10 i rysunek `harmonogram.mmd`);
- po zmianie schematu w `docs/03a` (rozdział 4 i `er-1-0.mmd`);
- po zmianie makiet (`manifest/zrodla/makiety/`, potem `node manifest/zrodla/render.js makiety`);
- przy każdym wydaniu: nowy numer w tytule rozdziału 00 i w `build.py` (nazwy plików wynikowych).
