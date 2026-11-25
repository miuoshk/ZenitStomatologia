# Manifest Crux · wydanie 1.0 „Krasnodrzew”

Folder do pokazania ludziom, którzy nie będą czytać dokumentacji: wspólnikom, recepcji, księgowej, programiście na pierwszej rozmowie. Mówi, czym Crux jest, jak wygląda, co kto dostaje, jak rośnie i jakie są zasady marki w aplikacji.

| Plik | Co to jest |
|---|---|
| `CRUX-MANIFEST-1.0.pdf` | 16 plansz A4 poziomo: okładka, czym jest Crux, dwie marki, znak, Krasnodrzew, role, trzy ekrany, model kuleczkowy, wydania, czego się spodziewać, fundamenty, jak dokładamy, zakończenie |
| `plansze/01…16-*.png` | te same plansze jako obrazy (do wklejenia w prezentację, wiadomość, na ścianę) |
| `makiety/*.png` | makiety ekranów 1.0 z danymi przykładowymi: logowanie, obłożenie, pulpit, personel, „O Crux” (1440×900, 2×) |
| `zrodla/manifest.py` → `manifest.html` | generator plansz (Python buduje HTML z tokenów marki) |
| `zrodla/makiety/generuj.py`, `app.css`, `*.html` | generator makiet: szkielet aplikacji w HTML na tokenach z `docs/06` |
| `zrodla/render.js` | Playwright: `node zrodla/render.js makiety` (PNG makiet), `manifest` (PDF + PNG plansz), `all` |
| `zrodla/marka/` | kopia pakietu marki używana przez generatory: `tokens.css`, logo (SVG), ryciny Köhlera (SVG), czcionki Hanken Grotesk, ikona aplikacji, próbki wykresów |

## Jak odświeżyć

```
cd crux/manifest/zrodla
python3 makiety/generuj.py        # makiety HTML → zrodla/makiety/*.html
python3 manifest.py               # plansze HTML → zrodla/manifest.html
node render.js all                # PNG makiet, PDF manifestu i PNG plansz
```

Źródłem kolorów, czcionek i znaku jest pakiet marki (`../Materialy marki/`, `../Crux - dla tworcow aplikacji/`) opisany w `docs/06-design-system.md` i `docs/14-guideline-aplikacji.md`. Gdy pakiet się zmienia, najpierw `zrodla/marka/` (kopia), potem makiety i plansze, na końcu podręcznik (`python3 podrecznik/build.py`), żeby wszystkie trzy mówiły to samo.

Makiety nie są projektem pikselowym do odwzorowania 1:1; pokazują układ, komponenty i ton. Wiążące są tokeny i komponenty z `packages/ui` (prompt K08).
