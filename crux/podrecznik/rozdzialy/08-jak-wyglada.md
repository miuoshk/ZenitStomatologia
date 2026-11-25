# 8 · Jak to wygląda: marka w aplikacji

Źródła: `docs/14-guideline-aplikacji.md` (zasady marki dla wszystkich aplikacji), `docs/06-design-system.md` (Crux), `crux-ksiega-znaku-1.0.pdf`, pakiet `Materialy marki/`. Makiety poniżej są wygenerowane z `manifest/zrodla/makiety/` na danych przykładowych i pokazują docelowy wygląd ekranów 1.0.

## 8.1 Dziesięć zasad, które łamie się najczęściej

1. Kolory, odstępy i zaokrąglenia wyłącznie z tokenów (`packages/ui/brand/tokens.css`, kopia 1:1 z pakietu marki). Każdy inny HEX w kodzie to błąd (`ui.no-hex`).
2. Krój Hanken Grotesk 400–800 z plików lokalnych. Liczby zawsze `tabular-nums` w polskim formacie: `1 234,50 zł`, `82%`, `14.02.2027`, `10:30`.
3. Tło jasne (kość), karty białe z obramowaniem mgły, butelkowa zieleń w pasku bocznym. Bez cieni poza panelem bocznym i tooltipem.
4. **Bursztyn to słońce.** Tylko Ginan w znaku, kropka w „crux.”, wskaźnik „teraz” i obwódka fokusu. Nigdy tło, tekst ani seria danych.
5. Gabinet **01 to Nowodworska** (baza), **02 to Białowieska**; w UI zawsze „01 Nowodworska” przez `LocationChip` (numer z cieniem), nigdy „nr 1” ani „Gabinet 1”. Kolor danych gabinetu z `locations.color_key` i nie przechodzi na inny gabinet.
6. Logo zawsze z pliku SVG (`crux-poziomy-krem.svg` w pasku bocznym, `crux-znak-krem.svg` po zwinięciu) albo z `CruxLogo` rysującego geometrię z pliku. Nigdy z fontu.
7. **Pacjent nigdy nie widzi marki Crux**: SMS, PDF, portal i rezerwacja noszą zenit.stomatologia (strażnik `ui.brand-separation`).
8. Wykres ma jedną oś, linie 2 px, legendę przy ≥ 2 seriach, tooltip, widok tabeli. Nie ma wykresów kołowych, dwuosiowych, 3D ani bursztynu w danych.
9. Model kuleczkowy: gdy coś da się pokazać kuleczkami (zębami), pokazujemy to kuleczkami (łuk obłożenia, siatka, wykres kropkowy, kalendarz).
10. Ryciny Köhlera tylko w pustych stanach, na ekranie logowania i na stronie „O Crux” (roślina wydania). Ton: krótko, bezosobowo dla personelu; bez wykrzykników, emoji i „Ups”.

## 8.2 Ekrany 1.0

### Logowanie

{{makieta:logowanie}}

Butelkowe tło, `crux-poziomy-krem.svg` 58 px, rycina `szalwia.svg` w kremie, karta formularza na kości. Jedyna animacja znaku: gwiazdy pojawiają się od najjaśniejszej, Ginan ostatni, ≤ 600 ms, wyłączona przy `prefers-reduced-motion`. Po haśle kod TOTP; pierwsze logowanie wymusza zmianę hasła i rejestrację MFA.

### Powłoka aplikacji

Pasek boczny 232 px (zwijany do 64) na butelce: znak Crux, przełącznik gabinetu („01 Nowodworska”, „02 Białowieska”, „01 + 02 · cała sieć” dla `network.view`), nawigacja tylko z pozycjami bieżącego wydania (Obłożenie, Pulpit, Ustawienia, Integracje), na dole użytkownik i blokada. Górny pasek: paleta poleceń `Ctrl+K` (przejdź do ekranu, zmień gabinet, skocz do dnia; od 1.1 także pacjenci), data, użytkownik.

### Obłożenie

{{makieta:oblozenie}}

Siatka `HourGrid` z komórkami w kolorach kolornika, panel wpisu po prawej, pasek dnia z sumami i stanem zamknięcia. Szczegóły: rozdział 6.

### Pulpit sieci

{{makieta:pulpit}}

Jeden wiersz filtrów, rząd kafli z anatomią z `docs/06` 4.1, wykres główny na całą szerokość, siatka 2 × N kart w formach z modelu kuleczkowego. Szczegóły: rozdział 7.

### Ustawienia → Personel

{{makieta:personel}}

Lista osób z członkostwami, rolami i stanem konta (brak konta, zaproszona, aktywny · MFA, dezaktywowany); „Zaproś osobę” pokazuje hasło jednorazowe raz. Dane testowe mają syntetyczne nazwiska.

### Ustawienia → O Crux

{{makieta:o-crux}}

Wersja i nazwa wydania, data wdrożenia, zakres, stan analityki, linki do podręcznika i changelogu, rycina rośliny wydania (jedyne miejsce w aplikacji poza pustymi stanami i logowaniem).

## 8.3 Komponenty 1.0 (`packages/ui`)

| Grupa | Komponenty | Źródło zasad |
|---|---|---|
| Marka | `CruxLogo`, `ZenitLogo` (tylko dokumenty i portal), `LocationChip`, `LocationSwitcher` | `docs/06`, 3.1–3.3 |
| Powłoka | `AppShell`, `CommandPalette`, `SidePanel`, `Dialog`, `ConfirmDialog` (z polem powodu), `Toast`, `EmptyState` (z rycinami) | `docs/06`, 4 i 5 |
| Formularze | `Button` (primary/secondary/ghost/danger), `Input`, `Select`, `Combobox`, `DatePicker`, `TimePicker`, `PhoneInput`, `PeselInput` (od 1.1), `SegmentedControl`, `ChipToggle` | `docs/06`, 4; `docs/14`, 7 |
| Dane | `DataTable` (TanStack), `Num` (format polski, tabular, `aria-label`), `StatusPill`, `KpiTile`, `DeltaBadge`, `Card`, `CardHeader`, `ChartCard`, `FilterBar`, `HourGrid` | `docs/06`, 4.1–4.2 |
| Wykresy (`src/charts/`) | `ArchGauge`, `DotGrid`, `DotPlot`, `DotCalendar`, `Sparkline`, `PartsBar`, `LineChart`, `BarList` (z `variant="funnel"`); każdy z `TableView` i `role="img"` | `docs/06`, 6; `docs/14`, 6 |

Każdy komponent ma stronę w Storybooku (warianty, fokus, motyw ciemny, iPad 1024×768, test dostępności) i test wizualny; komponenty wykresów są porównywane ze wzorcami z `wykresy-przyklady/`.

## 8.4 Pakiet marki w repo

`pnpm brand:sync <ścieżka do Materialy marki>` kopiuje do `packages/ui/brand/`: `tokens.css`, `zenit-theme.tailwind.css`, fonty, logotypy Crux i zenit, ryciny (42 tablice zielnika, `currentColor`), do `src/brand/crux-geometry.json` i `src/charts/arch-geometry.json` geometrię znaku i łuku, do `src/charts/__reference__/` przykłady wykresów; zapisuje sumy kontrolne w `brand/manifest.json`. `crux-doctor` (`ui.brand-sync`) sprawdza, że nikt nie edytował plików marki w repo: zmiana tokena zaczyna się w `Materialy marki/`. Brakujące tokeny (np. `--dane-kulka-pusta`) żyją w `src/tokens.extra.css` z adnotacją do przeniesienia.

## 8.5 Lista kontrolna przed każdym PR z interfejsem (`docs/14`, sekcja 11)

- [ ] w diffie nie ma HEX-ów, `px` spoza skali ani `font-family` spoza tokenów
- [ ] bursztyn występuje na ekranie najwyżej w znaku, we wskaźniku „teraz” i w obwódce fokusu
- [ ] logo pochodzi z pliku SVG i ma zachowane pole ochronne
- [ ] gabinety: „01 Nowodworska”, „02 Białowieska”, kolory z `color_key`
- [ ] każdy wykres ma jedną oś, legendę (przy ≥ 2 seriach), tooltip, widok tabeli i nie zawiera bursztynu w danych
- [ ] wartość z naturalnym „100%” została rozważona jako łuk obłożenia lub siatka kuleczek
- [ ] liczby mają `tabular-nums` i polski format
- [ ] teksty przeszły przez listę słów z `docs/14`, sekcja 8; personel: forma bezosobowa
- [ ] ekran działa w trybie ciemnym, z klawiatury i przy 768 px (iPad)
- [ ] zrzut ekranu jest dołączony do PR, w obu motywach
