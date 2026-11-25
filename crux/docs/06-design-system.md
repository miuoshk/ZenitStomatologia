# 06 · Design system Crux

Wersja 2.2 · 6 listopada 2026. Crux to aplikacja robocza. Bierze z marki zenit.stomatologia kolory, krój, zaokrąglenia, kolornik usług i numery gabinetów, ale jest gęstsza, spokojniejsza i bardziej „narzędziowa”. Ma też **własny znak** (Krzyż Południa), opisany w `crux-ksiega-znaku-1.0.pdf`.

Źródła, w kolejności ważności:

1. `14-guideline-aplikacji.md`: zasady marki wspólne dla wszystkich aplikacji sieci (strona, rezerwacja, portal pacjenta, Crux). Jeśli ten plik i `14` mówią co innego o kolorze, kroju lub komponencie, wygrywa `06`, a rozbieżność trafia do sekcji 8 i do PR na oba pliki.
2. `Materialy marki/` (dysk wspólny „Zenit Stomatologia”): brandbook zenit 1.0, księga znaku Crux 1.0, tokeny, fonty, logotypy, ikony, ryciny, przykłady wykresów. Do repo kopiujemy z niego tylko to, co potrzebne, do `packages/ui/brand/` (sekcja 2.1).
3. `Crux - dla tworcow aplikacji/`: ten sam pakiet w wersji dla programistów i agentów: `geometria/crux-geometria.json`, `geometria/luk-geometria.json`, `komponenty/CruxLogo.tsx`, `komponenty/ArchGauge.tsx`.
4. `design/crux-dashboard-prototyp.html`: referencja układu pulpitu (prototyp z numeracją poprawioną na 01 Nowodworska / 02 Białowieska).

Specyfikacja dashboardów i rejestr metryk: `11-dashboardy-i-raporty.md`.

## 1. Zasady

1. **Kość jako tło, białe karty, butelka w nawigacji.** Jasna część dominuje (praca 8 godzin przy monitorze), ciemna zieleń tylko w pasku bocznym i nagłówkach sekcji premium.
2. **Bursztyn raz na ekran.** Bursztyn to słońce: Ginan w znaku Crux, wskaźnik „teraz” w terminarzu, obwódka fokusu, kropka w „crux.”/„zenit.”. Nigdy tło przycisku, nigdy tekst, nigdy seria na wykresie.
3. **Kolornik niesie znaczenie usług.** Z1–Z+ to te same kolory w terminarzu, planie leczenia, cenniku i na stronie.
4. **Liczby tabelaryczne.** Każda kwota, godzina, procent i liczba KPI ma `font-variant-numeric: tabular-nums` (zgodnie z `14`, sekcja 0 pkt 2; wcześniejsza wersja prototypu miała liczby KPI proporcjonalne, to zostało ujednolicone).
5. **Wyróżniamy wyłącznie wagą kroju.**
6. **Polski interfejs w formie Pan/Pani** w komunikatach dla pacjenta. Interfejs personelu jest bezosobowy („Zapisano wizytę”).
7. **Tryb ciemny jest wspierany** (tokeny mają oba motywy), ale domyślny jest jasny; przełącznik w ustawieniach użytkownika.
8. **Dwie marki, jeden system.** Personel widzi znak Crux (pasek boczny, logowanie, ikona aplikacji, raporty wewnętrzne). **Pacjent nigdy nie widzi marki Crux**: SMS, PDF, portal, rezerwacja i każdy wydruk noszą markę zenit.stomatologia. ZENIT LABS to osobna marka i nie pojawia się w Crux.
9. **Model kuleczkowy.** Gdy dana jest policzalna albo ma naturalne „100%”, pokazujemy ją kuleczkami (łuk obłożenia, siatka), bo wtedy wykres jest częścią marki (sekcja 6).

## 2. Tokeny

Tokeny są jedynym źródłem kolorów, odstępów i zaokrągleń w kodzie. **Nie piszemy ich ręcznie**: plik `Materialy marki/tokeny/tokens.css` (zmienne CSS, jasny + `[data-theme="dark"]`) kopiujemy bez zmian do `packages/ui/brand/tokens.css`, a `tokeny/zenit-theme.tailwind.css` do `packages/ui/brand/zenit-theme.tailwind.css` (Tailwind v4 `@theme`). `tokens.json` służy Figmie i narzędziom natywnym. Każda zmiana tokena zaczyna się w `Materialy marki/` i wraca do repo jedną kopią; `crux-doctor` porównuje sumy kontrolne (`ui.brand-sync`).

Tabele poniżej są przeglądem wartości z `tokens.css`; przy rozbieżności źródłem jest plik.

### 2.1 Pliki marki w repo (`packages/ui/brand/`)

| Potrzebujesz | Plik w `Materialy marki/` | W repo |
|---|---|---|
| tokeny CSS (jasny + ciemny) | `tokeny/tokens.css` | `packages/ui/brand/tokens.css` |
| tokeny dla Tailwind v4 | `tokeny/zenit-theme.tailwind.css` | `packages/ui/brand/zenit-theme.tailwind.css` |
| font | `font/HankenGrotesk-VF.ttf` (zmienny) lub statyczne 400/600/800, `LICENCJA.txt` (SIL OFL) | `packages/ui/brand/fonts/` |
| logo Crux | `crux/logo/<układ>/crux-<układ>-<kolor>.svg`; układy `znak`, `poziomy`, `poziomy-bez-podpisu`, `krotki`, `nazwa` | `packages/ui/brand/logo/crux/` |
| logo zenit (dokumenty dla pacjenta) | `zenit/logo/<układ>/zenit-<układ>-<kolor>.svg`; układy `lukowy`, `poziomy`, `krotki`, `nazwa`, `znak-pelny`, `znak-kompakt`, `znak-mikro` | `packages/ui/brand/logo/zenit/` |
| geometria znaku i łuku do kodu | `geometria/crux-geometria.json`, `geometria/luk-geometria.json` | `packages/ui/src/brand/crux-geometry.json`, `packages/ui/src/charts/arch-geometry.json` |
| favicony, ikony PWA, manifest | `crux/ikony/` (Crux), `zenit/ikony/` (strona, portal) | `apps/web/public/` |
| numery gabinetów 01, 02 | `zenit/numery-gabinetow/` (wzorzec; w UI renderuje je `LocationChip`) | — |
| ryciny Köhlera (zielnik, 42 tablice) | `ryciny-kohler/svg/` (`currentColor`), `svg-48px/` do małych rozmiarów; katalog i role: `ryciny-kohler/ZIELNIK.md` | `packages/ui/brand/ryciny/` |
| przykłady wykresów (wzorzec do porównania w testach wizualnych) | `wykresy-przyklady/*.svg` | `packages/ui/src/charts/__reference__/` |

Kolory plików logo: `zielen` (na jasnym tle), `krem` (na butelce lub zieleni), `czarny` i `bialy` (jednobarwne, tylko gdy technologia nie pozwala na kolor). Wszystkie logotypy mają tekst zamieniony na krzywe: **nie odtwarzamy logo fontem w HTML**, zawsze SVG z pliku (`<img>` lub komponent) w rozmiarze zachowującym proporcje.

### Kolory marki

| Token | HEX | Użycie w Crux |
|---|---|---|
| `--zenit-butelka` | `#173A2A` | pasek boczny, nagłówki premium, tekst główny na jasnym |
| `--zenit-zielen` | `#2F5A33` | przycisk główny, aktywny element nawigacji, linki, wypełnione kuleczki |
| `--zenit-krem` | `#EFE4C6` | tekst i ikony na butelce, tło wyróżnionych chipów |
| `--zenit-kosc` | `#F7F3E8` | tło aplikacji |
| `--zenit-bursztyn` | `#E9A53A` | tylko: Ginan w znaku, wskaźnik „teraz”, obwódka fokusu, kropka w nazwie |
| `--zenit-cegla` | `#B8442E` | tylko cień numeru gabinetu w trybie ciemnym |
| `--zenit-szron` | `#E4ECE5` | tło zaznaczenia, hover wiersza |
| `--zenit-mgla` | `#CFDBD1` | obramowania, puste kuleczki łuku |
| `--zenit-porost` | `#AFC2B3` | nieaktywne elementy, linie porostu w wykresie kropkowym i sparkline |
| `--zenit-patyna` | `#87A08F` | ikony drugorzędne, linia odniesienia |
| `--zenit-mech` | `#5E7F6A` | tekst drugorzędny (tylko ≥ 14 px pogrubiony lub ≥ 18 px) |
| `--zenit-las` | `#4A6E52` | tekst drugorzędny na kości, etykiety kafli |

### Tokeny semantyczne interfejsu

| Token | Jasny | Ciemny | Uwagi |
|---|---|---|---|
| `--surface-app` | kość | `#10221A` | tło |
| `--surface-card` | `#FFFFFF` | `#173126` | karty, tabele |
| `--surface-sunken` | `#F1ECDD` | `#132A20` | pola filtrów, tło wykresu |
| `--text-primary` | butelka | krem | |
| `--text-secondary` | las | `#C9D6CB` | |
| `--text-muted` | `#6B7F70` | `#9DB2A3` | podpisy osi, metadane |
| `--border` | mgła | `#2A4A3A` | |
| `--grid` | `#E2E6DE` | `#2A4A3A` | siatka wykresów (1 px) |
| `--focus-ring` | bursztyn 2 px + 2 px odstępu w kolorze tła | jak jasny | z księgi znaku |
| `--radius-pole` / `-input` / `-karta` / `-pelne` | 8 / 14 / 22 / 999 px | | |
| `--space-4` … `--space-64` | 4, 8, 12, 16, 24, 32, 48, 64 px | | |

### Statusy

Tokeny `--status-dobrze`, `--status-uwaga`, `--status-powazne`, `--status-krytyczne` i ich tła `--status-*-tlo` są w `tokens.css` (rozszerzenie interfejsowe marki spoza brandbooku). Stan zawsze z ikoną i słowem, nigdy samym kolorem; kolorów statusów nie wolno użyć jako serii na wykresie.

| Stan | Tekst (jasny) | Tło (jasny) | Tekst (ciemny) | Tło (ciemny) | Przykład |
|---|---|---|---|---|---|
| dobrze | `#2F5A33` | `#E4ECE5` | `#BFD9C3` | `#24452F` | potwierdzona, zapłacono |
| uwaga | `#7A5A12` | `#F5E9C8` | `#F0D89B` | `#4A3B16` | niepotwierdzona, praca lab nie wróciła |
| poważne | `#8A4A1C` | `#F4DECB` | `#F2C9A8` | `#4D3320` | spóźnienie powyżej 15 min |
| krytyczne | `#8F2F22` | `#F3D9D2` | `#F2B9AC` | `#4D2620` | nieobecność, odrzucone przez P1 |

### Kolory danych (wykresy)

Tożsamość gabinetów: tokeny `--dane-gabinet-01…04`, sprawdzone walidatorem (jasność, nasycenie, rozróżnialność przy zaburzeniach widzenia barw, kontrast z kartą).

| Gabinet | Ulica | Jasny motyw | Ciemny motyw |
|---|---|---|---|
| **01** | **Nowodworska** (baza sieci) | `#2F7D45` | `#3E9E57` |
| 02 | Białowieska | `#3A76AC` | `#5089D8` |
| 03 | Kłodzko (plan) | `#C98422` | `#C08526` |
| 04 | Mysłowice (plan) | `#A3533B` | `#9C78CC` (do ponownej walidacji przed uruchomieniem 04) |

Wielkość jednej miary: skala zieleni `--dane-skala-1…7` od szronu do butelki (`#E4ECE5`, `#CFDBD1`, `#AFC2B3`, `#87A08F`, `#5E7F6A`, `#2F5A33`, `#173A2A`); słupki i segmenty paska części biorą kolory z tej skali.

- Kolor jest przypisany do gabinetu na stałe (`locations.color_key`); pozycja w rankingu ani w tablicy go nie zmienia. Filtr, który ukrywa gabinet, nie przemalowuje pozostałych.
- Kolornik Z1–Z+ jest za jasny na słupek na białym tle: w wykresach usług kategorię pokazuje próbka koloru przy etykiecie, słupek ma kolor zieleni.
- Linia celu: szara przerywana (`--text-muted`, `3 3`), podpisana „cel”. Linia odniesienia (mediana sieci): patyna ciągła 1 px.
- Tekst nigdy nie przyjmuje koloru serii; kolor serii niesie kropka lub linia obok tekstu.

### Kolornik usług

Tokeny `--kolornik-z1…zplus` (tło) i `--kolornik-*-pasek` (pasek z lewej 4 px).

| Kod | Tło bloku w terminarzu | Pasek z lewej (4 px) | Tekst |
|---|---|---|---|
| Z1 | `#F6F1E1` | `#C9B37F` | butelka |
| Z2 | `#EFE4C6` | `#B8A06A` | butelka |
| Z3 | `#E6D6AE` | `#A88F55` | butelka |
| Z4 | `#D9C595` | `#8F7741` | butelka |
| Z5 | `#C9B37F` | `#6F5B2E` | butelka |
| Z+ | `#E4ECE5` | `#87A08F` | butelka |

### Typografia (aplikacja)

Hanken Grotesk 400–800 z plików lokalnych (`packages/ui/brand/fonts/`, wariant zmienny `HankenGrotesk-VF.ttf`; nie z Google Fonts w produkcji), zapas Arial. Token `--font-sans`.

| Poziom | Rozmiar / interlinia | Waga | Użycie |
|---|---|---|---|
| Tytuł ekranu | 28 / 32 | 800, tracking −0,03 em | jeden na ekran |
| Nagłówek sekcji | 18 / 24 | 800 | karty, panele |
| Liczba KPI | 30–32 / 34–36 | 800, tabular | kafle metryk; jednostka 15 / 700 |
| Liczba w łuku obłożenia | 28–32 | 800, tabular | w miejscu „zenit” pod łukiem |
| Tekst | 14 / 20 | 400 | domyślny |
| Tekst mały | 12,5 / 16 | 500 | tabele gęste, metadane |
| Etykieta kafla | 12 / 16 | 600, las | nad liczbą KPI |
| Etykieta | 11 / 14 | 700, wersaliki, +0,12 em | nad polami, nad sekcjami |

Nagłówki nie kończą się kropką; nie piszemy całych zdań wersalikami; nie używamy kursywy ani podkreśleń poza linkami.

### Formaty liczb, dat i godzin

Jedna implementacja w `packages/shared` (`Money.format()`, `formatDateTimePl`, `formatTimePl`, `formatPercent`) i jeden komponent `Num` w `packages/ui`, który dokłada `tabular-nums` i `aria-label` czytelny dla czytnika ekranu („82 procent”).

| Rodzaj | Interfejs | Dokumenty i PDF |
|---|---|---|
| kwota | `1 234,50 zł` (spacja niełamliwa jako separator tysięcy, przecinek dziesiętny, `zł` po spacji) | tak samo |
| procent | `82%` | `82 %` w dokumentach prawnych (umowy, zgody) |
| zmiana | `▲ 4 pp r/r`, `▼ 3,4%`; strzałka i słowo, nigdy sam kolor | — |
| data | `14.02.2027` w tabelach i kaflach | `14 lutego 2027` w zdaniach, pismach, SMS |
| godzina | `10:30` | `10:30` |
| duże liczby w kaflach | `412 tys. zł`, `1,2 mln zł` | pełna kwota |

### Odstępy i kształty

- Skala odstępów: 4, 8, 12, 16, 24, 32, 48, 64 (tokeny `--space-*`). Nie używamy innych wartości.
- Zaokrąglenia: 8 (pola, chipy prostokątne, bloki wizyt), 14 (inputy, tooltip), 22 (karty), pełne (przyciski, chipy statusu, segmenty filtrów).
- Pola dotyku min. 44 px na iPadzie; na desktopie wiersze tabel 36 px (gęsty) lub 44 px (zwykły).
- Cienie: brak (wyjątek: tooltip i panel boczny, cień `0 6px 18px rgba(23,58,42,.12)`). Karty oddziela kolor tła i obramowanie 1 px mgły.
- Ruch: przejścia 120–200 ms `ease-out`; bez sprężyn, odbić i konfetti; dane odświeżają się bez migania; `prefers-reduced-motion` respektowane wszędzie.

## 3. Elementy charakterystyczne

### 3.1 Znak Crux w aplikacji

Crux to Krzyż Południa: pięć gwiazd jako kuleczki w prawdziwych pozycjach (J2000), wielkość według jasności, Ginan w bursztynie (najmniejsza i jedyna poza osiami, więc znak ma kierunek i nie myli się z plusem). Jedna wersja znaku we wszystkich rozmiarach od 16 px; nie dokładamy łańcuszków kropek, linii krzyża ani dodatkowych gwiazd. Pole ochronne: średnica Acrux z każdej strony.

| Miejsce | Plik | Rozmiar |
|---|---|---|
| pasek boczny rozwinięty (232 px) | `crux-poziomy-krem.svg` (znak + „crux.” + podpis „zenit.stomatologia”) na butelce | wysokość 28 px |
| pasek boczny zwinięty (64 px) | `crux-znak-krem.svg` | 28 px |
| ekran logowania | `crux-poziomy-krem.svg` na butelce, rycina szałwii (`svg-krem`) obok | wysokość 58 px |
| ikona aplikacji, favicon, PWA | `crux/ikony/favicon.svg`, `favicon.ico`, ikony z manifestu | — |
| nagłówek raportu wewnętrznego (PDF dla zarządu) | `crux-krotki-zielen.svg` | 10 mm |
| pusty stan, ekran błędu 500 | sam znak `crux-znak-zielen.svg` nad komunikatem | 40 px |

- Komponent `CruxLogo` (`packages/ui/src/brand/CruxLogo.tsx`, wzorzec w `Crux - dla tworcow aplikacji/komponenty/CruxLogo.tsx`) rysuje znak z `crux-geometry.json` w `currentColor` z Ginan w `--zenit-bursztyn`; prop `monochrome` tylko dla druku jednobarwnego. Do logotypu z nazwą zawsze SVG z pliku.
- Jedyna animacja znaku: wejście na ekranie logowania, gwiazdy pojawiają się od najjaśniejszej (Acrux, Mimosa, Gacrux, Imai), Ginan ostatni, ≤ 600 ms `ease-out`, wyłączona przy `prefers-reduced-motion`.
- Logo nie dostaje cieni, poświaty, gradientów, konturu, obrotu, rozciągnięcia ani zmiany koloru kuleczek.

### 3.2 Marka zenit w tym, co widzi pacjent

| Miejsce | Plik | Rozmiar |
|---|---|---|
| nagłówek PDF dla pacjenta (plan leczenia, zgoda, faktura, historia) | `zenit-poziomy-zielen.svg` | 12 mm wysokości |
| stopka e-mail z Crux do pacjenta | `podpis-email/zenit-krotki.png` | wysokość 28 px |
| portal pacjenta, rezerwacja online (F3+) | `zenit-poziomy-zielen.svg` (jasny) lub `-krem` (ciemny hero) | 32 px |
| SMS | tekst „zenit.stomatologia”, bez logo | — |

Wersje znaku zenit według rozmiaru: pełna (16 kuleczek) od 64 px, kompakt (8) 24–64 px, mikro (6) 16–24 px. Szablony dokumentów dla pacjenta (React → PDF, generowane w workerze) żyją w `packages/ui/src/documents/`, szablony SMS i e-maili w `@crux/messaging`, rezerwacja w `apps/web/app/(public)/`. `crux-doctor` (`ui.brand-separation`) sprawdza, że w tych trzech miejscach nie ma żadnego pliku `crux-*` ani `CruxLogo`.

### 3.3 Pozostałe

- **Chip gabinetu (`LocationChip`):** numer dwucyfrowy w Hanken 800 z cieniem (na jasnym: zieleń z cieniem bursztynowym `.05em .05em 0`; na ciemnym: bursztyn z cieniem w cegle) + nazwa ulicy: „01 Nowodworska”, „02 Białowieska”. Nie piszemy „nr 1”, „#1” ani „Gabinet 1”. Używany w przełączniku gabinetów, nad kolumnami foteli, w tabelach, listach i legendach wykresów.
- **Wskaźnik „teraz”:** pozioma linia 2 px w kolorze bursztynu z kropką-słońcem 12 px na początku i godziną po prawej. Jedyne miejsce, gdzie bursztyn żyje na ekranie terminarza.
- **Ryciny Köhlera:** tylko w pustych stanach (np. „Brak wizyt w tym dniu”, mięta) i na ekranie logowania (szałwia), jednobarwne (mech na jasnym, krem na ciemnym) przez `color` w CSS, pliki z `ryciny-kohler/svg/` (pełny detal) albo `svg-48px/` (ikony do 96 px). Nigdy w gęstych widokach roboczych. Jedyny wyjątek: strona „O Crux” (`/ustawienia/o-crux`) pokazuje rycinę bieżącego wydania (1.0: `krasnodrzew.svg`; `07`, sekcja 2) obok numeru wersji. Katalog roślin i ich ról: `ryciny-kohler/ZIELNIK.md`.

## 4. Inwentarz komponentów `packages/ui`

| Komponent | Faza | Warianty / uwagi |
|---|---|---|
| `documents/*` (`EstimatePdf`, `ConsentPdf`, `InvoicePdf`, `HistoryPdf`) | F2+ | szablony PDF dla pacjenta w szacie zenit: `zenit-poziomy-zielen.svg` 12 mm w nagłówku, numer gabinetu, kolornik przy pozycjach; nigdy znak Crux |
| `AppShell` | F0 | pasek boczny 232 px (zwijany do 64) ze znakiem Crux (3.1), nawigacja tylko z pozycjami bieżącego wydania (bez „wkrótce”), górny pasek z `CommandPalette` (`Ctrl+K`), wyborem daty, użytkownikiem; obszar treści max 1440 px (terminarz pełna szerokość) |
| `CommandPalette` | F0 | `Ctrl+K`: przejdź do ekranu, zmień gabinet, skocz do dnia; od 1.1 źródłem wyników jest też `PatientSearch` |
| `HourGrid` | F0 | siatka godzin × kolumn (fotele) z nawigacją klawiaturą, zaznaczaniem zakresu i polem fokusu; bez logiki domenowej; używana przez obłożenie (1.0) i widok tygodnia |
| `FilterBar`, `ChartCard`, `DeltaBadge` | F0 | kontrakt URL filtrów (`11`, sekcja 3), anatomia karty wykresu (4.2), pigułka zmiany ze strzałką i słowem |
| `CruxLogo`, `ZenitLogo` | F0 | `CruxLogo` z geometrii (znak), `ZenitLogo` jako wrapper na pliki SVG z `brand/logo/zenit` (tylko do dokumentów i portalu) |
| `LocationChip`, `LocationSwitcher` | F0 | numer z cieniem + nazwa; kolor danych z `color_key`; wariant `soon` (wyszarzony, dla 03 i 04) |
| `Num` | F0 | liczba z `tabular-nums`, formatem polskim i `aria-label` |
| `Button` | F0 | `primary` (zieleń/krem), `secondary` (obramowanie), `ghost`, `danger` (tekst krytyczny, bez czerwonego tła); rozmiary 36/44; jeden `primary` na ekran |
| `Input`, `Select`, `Combobox`, `DatePicker`, `TimePicker`, `PhoneInput`, `PeselInput` (walidacja, maska) | F0 | zaokrąglenie 14, fokus bursztynowy, błąd pod polem z tekstem, co zrobić |
| `SegmentedControl`, `ChipToggle` (kategorie Z) | F0 | filtry |
| `DataTable` | F0 | TanStack, nagłówek przyklejony, sortowanie, kolumny liczbowe do prawej, gęstość 36/44, pusty stan z działaniem |
| `KpiTile` | F0 | anatomia w 4.1; `Sparkline` z kropką |
| `Card`, `CardHeader` (tytuł + podpowiedź + akcje) | F0 | karta wykresu: anatomia w 4.2 |
| `StatusPill` | F0 | dobrze/uwaga/poważne/krytyczne, ikona + słowo |
| `SidePanel` (szuflada prawa, 420 px) | F0 | szczegóły wizyty, pacjenta, zlecenia; zamykanie `Esc` |
| `Dialog`, `ConfirmDialog` (z polem powodu) | F0 | korekty, anulowania, break-glass |
| `Toast` | F0 | bez ikon alarmowych, tekst + opcjonalne „Cofnij” (tylko tam, gdzie domena pozwala) |
| `EmptyState` | F0 | rycina + 1 zdanie + 1 działanie |
| `ScheduleGrid` | F1 | własny komponent (ADR-019): kolumny foteli, bloki, wskaźnik „teraz”, dnd-kit |
| `SignaturePad` | F2 | podpis na iPadzie, eksport PNG do PDF |
| `Charts` (`packages/ui/src/charts/`) | F0 (komplet w 1.0) | `ArchGauge`, `DotGrid`, `DotPlot`, `DotCalendar`, `Sparkline`, `PartsBar`, `LineChart`, `BarList` (z wariantem lejka); każdy z `TableView`, `role="img"` i opisem; geometria łuku z `arch-geometry.json` |
| `Odontogram` | F4 | SVG 32 zębów FDI + mleczne, stany z `03`, tryb tylko do odczytu i tryb wejścia do wpisu |

Każdy komponent ma stronę w Storybooku z wariantami, stanem fokusu i motywem ciemnym; testy wizualne w CI. Komponenty wykresów mają dodatkowo porównanie ze wzorcem z `wykresy-przyklady/`.

### 4.1 Anatomia kafla KPI (`KpiTile`)

Kolejno: etykieta (12 px, 600, las) · liczba (30–32 px, 800, tabular) z jednostką (15 px, 700) · sparkline po prawej (linia porostu 2 px, kropka końcowa 8 px w kolorze gabinetu lub lasu z pierścieniem w kolorze karty, bez osi) · pod spodem pigułka zmiany ze strzałką i słowem („▲ 4 pp r/r”) w kolorze `dobrze` albo `uwaga`. O kolorze decyduje **znaczenie** zmiany: spadek nieobecności to dobra wiadomość, więc jest zielony (`metricRegistry[].goodDirection`). Kafel jest linkiem do drążenia; przy fokusie obwódka bursztynowa. Definicję metryki pokazuje podpowiedź przy etykiecie.

### 4.2 Anatomia karty wykresu

Tytuł mówi, co widać („Obłożenie foteli rośnie w 01, stoi w 02”); nazwa miary jest w podpowiedzi · podpowiedź z definicją z rejestru metryk · legenda (przy ≥ 2 seriach, z `LocationChip` dla gabinetów) · przełącznik „Wykres | Tabela” · wykres · stopka z zakresem i źródłem („30 dni · dane z 5 listopada 10:40”). Tooltip po najechaniu i po fokusie, wartość pogrubiona przed nazwą serii, obszar trafienia większy niż znak, celownik na liniach.

## 5. Wzorce ekranów

### Powłoka aplikacji
- Pasek boczny: znak Crux, przełącznik gabinetu („01 + 02 · cała sieć” lub jeden gabinet), nawigacja: Dziś, Terminarz, Pacjenci, Plany leczenia, Finanse, Laboratorium, Recall, Pulpit, Integracje, Ustawienia (widoczność wg uprawnień).
- Górny pasek: paleta poleceń `Ctrl+K` (od 1.1 także wyszukiwarka pacjenta), wybór daty (na Obłożeniu, Dziś, Terminarzu), użytkownik, blokada ekranu.
- Nawigacja 1.0: Obłożenie, Pulpit, Ustawienia (Organizacja, Personel, System, O Crux), Integracje. Kolejne pozycje pojawiają się z wydaniami przez flagi.

### Siatka obłożenia (1.0)
- `HourGrid`: kolumny = fotele z chipem gabinetu, wiersze = godziny otwarcia; komórka pusta (kość), z wpisem (tło kolornika kategorii, pasek 4 px w kolorze krawędzi, inicjały wykonawcy, kwota), zablokowana (kreskowanie mgłą + słowo), poza godzinami (wyszarzona). Fokus klawiatury: obwódka bursztynowa; zaznaczenie zakresu: tło szronu. Pasek dnia pod siatką: sumy, „Dzień jak wczoraj”, „Zamknij dzień”. Szczegóły: spec F0-010.

### Dashboard
- Jeden wiersz filtrów nad wszystkim (zakres dat, gabinety, wykonawca, kategoria Z); filtry w URL; każdy kafel, wykres i tabela reaguje na te same filtry; układ: rząd kafli KPI, jeden główny wykres na całą szerokość, siatka 2 × N kart; szczegóły i liczba kafli per pulpit w `11`.
- Wykresy: procedura z `14`, sekcja 6.1 (forma przed kolorem, kolor według zadania, jedna oś Y, znaki graficzne, etykiety, interakcja, dostępność, linia celu, sprawdzenie na oko). Nie używamy wykresów kołowych ani pierścieniowych, 3D, dwóch osi Y, tęczowych skal, bursztynu w danych, gradientów, cieni pod liniami, animowanego wchodzenia wykresów ani liczb przy każdym punkcie.

### Tabele
- Nagłówek przyklejony, sortowanie, liczby do prawej, `zł` i `%` w nagłówku; pusta tabela: komunikat + jedno działanie.

### Formularze
- Etykieta nad polem, pomoc pod polem, błędy przy polu i podsumowanie u góry przy wielu; zapis `Ctrl+Enter`; nieudany zapis nie czyści pola.

## 6. Model kuleczkowy (wykresy marki)

Kuleczka to ząb ze znaku zenit i gwiazda ze znaku Crux. Formy, kiedy ich używać i jak je zbudować:

| Forma | Komponent | Kiedy | Konstrukcja |
|---|---|---|---|
| Łuk obłożenia | `ArchGauge` | jedna wartość procentowa o dużym znaczeniu (obłożenie foteli, realizacja planu, frekwencja, potwierdzenia SMS) | 16 kuleczek w kształcie łuku znaku = 100%, jeden ząb = 6,25%; wypełnienie od lewej ósemki przez jedynki do prawej; liczba w środku łuku (Hanken 800, tabular) w miejscu „zenit”; etykieta pod spodem; bez słońca; pełne kuleczki `--zenit-zielen` (na butelce: krem), puste `--zenit-mgla` (na butelce: `--border` ciemny) |
| Siatka kuleczek | `DotGrid` | udział lub liczebność („37 z 50 pacjentów wróciło na recall”) | siatka 10 × N, kuleczka = 1 osoba lub 1%; pełne w zieleni, puste w `--dane-kulka-pusta` (sekcja 8); zastępuje wykres kołowy |
| Wykres kropkowy | `DotPlot` | porównanie gabinetów w kilku miarach | wiersz = miara, kropka = gabinet w swoim kolorze, gruba linia porostu łączy min i max, pionowa kreska oznacza medianę sieci |
| Kalendarz kuleczek | `DotCalendar` | rytm w czasie (obłożenie dni tygodnia przez kwartał) | kolumna = tydzień, wiersz = dzień pn–sb, kolor ze skali zieleni |
| Sparkline z kropką | `Sparkline` | trend w kaflu KPI | linia porostu 2 px, kropka końcowa w kolorze gabinetu lub lasu z pierścieniem w kolorze karty, bez osi |
| Pasek części | `PartsBar` | struktura sumy (przychód wg kategorii Z) | segmenty ze skali zieleni, odstęp 2 px, zaokrąglenie 4 px, procent w segmencie, gdy się mieści, reszta w legendzie |

Geometria łuku nie jest rysowana na oko: pozycje i promienie 16 kuleczek są wyliczone z konstrukcji znaku (szerokości zębów w mm 8,5 · 6,5 · 7,5 · 7,0 · 6,5 · 10,0 · 9,0 · 8,5; łuk to superelipsa o wykładniku 2,1 i wysokości 1,5 połowy szerokości; przerwy równe). Współrzędne są w `luk-geometria.json` (szerokość 1, wysokość 0,7704; 16 wpisów `i0…i15` z `cx`, `cy`, `r`) i trafiają do `packages/ui/src/charts/arch-geometry.json`; `ArchGauge` skaluje je przez prop `width` (domyślnie 220, minimum 120). Wzorzec implementacji: `Crux - dla tworcow aplikacji/komponenty/ArchGauge.tsx` (`value` 0–1, `label`, `width`; `filled = Math.round(value * 16)`).

Wykresy klasyczne (`LineChart`, `BarList`) zostają tam, gdzie kuleczki nie pasują: zmiana w czasie wielu serii, rankingi usług. Decyzję o formie per metryka zapisuje rejestr metryk w `11` (kolumna „forma”).

## 7. Ton interfejsu

- Krótko i konkretnie: „Wizyta przeniesiona na 14 lutego, 10:30. Pacjent dostanie SMS.”
- Bez wykrzykników, bez „Ups!”, bez emoji.
- Słowa: gabinet, lekarz dentysta, higienizacja, leczenie kanałowe, plan leczenia, wizyta, pacjent. Unikamy: klinika, stomatolog (w UI), doktor, endo, kanałówka, scaling, oferta, kosztorys (w UI pacjenta), zabieg (gdy chodzi o termin), klient, „kompleksowo”, „najwyższa jakość”, „bezbolesne”.
- Błędy mówią, co zrobić: „Ten termin koliduje z wizytą na fotelu 2. Wybierz inny fotel lub godzinę.”
- Komunikaty do pacjenta (SMS, PDF, portal): Pan/Pani, pełne zdania, cena wprost. Wzór SMS: „Dzień dobry, przypominamy o wizycie w zenit.stomatologia, gabinet 01 Nowodworska, 14 lutego o 10:30. Prosimy o potwierdzenie odpowiedzią TAK.”

## 8. Rozbieżności z `14` i pakietem marki (do PR na oba pliki)

| Temat | `14` / pakiet | `06` (obowiązuje w Crux) | Status |
|---|---|---|---|
| liczby KPI | zawsze `tabular-nums` (`14`, 0.2) | tak samo; prototyp miał proporcjonalne | ujednolicone w 2.1, prototyp do poprawy przy K08 |
| pusta kuleczka siatki | `#DCE4DD` (`14`, 6.3), brak w `tokens.css` | token `--dane-kulka-pusta: #DCE4DD` (jasny) / `#2A4A3A` (ciemny) | do dodania w `tokens.css` w `Materialy marki/`, potem kopia do repo |
| liczba kafli KPI | „rząd 4 kafli” (`14`, 6.5) | 4 domyślnie; pulpit sieci na ≥ 1440 px może mieć 6 (`11`) | zapis w `11` v1.1 |
| szerokość paska bocznego | 232 px (`14`, 3) | 232 px; prototyp ma 220 | prototyp do poprawy przy K08 |
| `Funnel` | brak w liście `14` | wariant `BarList` | nazewnictwo w kodzie: `BarList variant="funnel"` |
| numeracja gabinetów | 01 Nowodworska, 02 Białowieska | tak samo | starsze dokumenty poprawione 6 listopada 2026 |

Lista kontrolna przed PR z interfejsem: `14`, sekcja 11 (bez HEX-ów poza tokenami, bursztyn tylko w trzech miejscach, logo z pliku, „01 Nowodworska”/„02 Białowieska”, wykres z jedną osią i tabelą, wartość z naturalnym „100%” rozważona jako łuk lub siatka, polskie formaty liczb, słownik z sekcji 7, tryb ciemny, klawiatura, 768 px, zrzut ekranu w PR).
