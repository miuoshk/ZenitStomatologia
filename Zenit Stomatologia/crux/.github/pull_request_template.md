## Co / dlaczego

<!-- krótko: zmiana i powód -->

## Prompt / ledger

- Prompt: `prompts/….md#K…`
- Wpis w `prompts/ledger.md`: tak / nie

## Definicja ukończenia (AGENTS.md)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:db`, `pnpm run doctor` przechodzą
- [ ] nowe tabele mają wpis w `03a`, RLS, komentarz, trigger audytu i test pgTAP
- [ ] kryteria akceptacji ze specyfikacji mają testy `[ID/ACn]`
- [ ] brak danych pacjenta w logach i w zdarzeniach
- [ ] teksty w `packages/i18n/pl`, ton `docs/06`
- [ ] zaktualizowana dokumentacja / ADR, jeśli zmieniła się zasada lub model
- [ ] ryzyka i migracje opisane poniżej

## Lista kontrolna UI (`docs/14`, sekcja 11)

- [ ] W diffie nie ma HEX-ów, `px` spoza skali ani `font-family` spoza tokenów
- [ ] Bursztyn najwyżej w znaku, wskaźniku „teraz” i obwódce fokusu
- [ ] Logo z pliku SVG, właściwy wariant rozmiaru, pole ochronne
- [ ] Gabinety: „01 Nowodworska”, „02 Białowieska”, `color_key`
- [ ] Wykres: jedna oś, legenda (≥2 serie), tooltip, widok tabeli, bez bursztynu w danych
- [ ] Liczby: `tabular-nums`, format PL
- [ ] Teksty: sekcja 8 guideline; Pan/Pani do pacjenta, bezosobowo do personelu
- [ ] Ciemny motyw, klawiatura, 768 px
- [ ] Zrzut ekranu dołączony

## Jak przetestowano

<!-- lokalne komendy, scenariusze -->

## Migracje / ryzyka

<!-- SQL, expand/contract, rollback -->
