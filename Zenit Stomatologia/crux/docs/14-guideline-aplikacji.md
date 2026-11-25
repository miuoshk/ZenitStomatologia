# 14 · Guideline aplikacji zenit i Crux

Wersja 1.2 · 13 listopada 2026. Dla ludzi i agentów AI, którzy piszą aplikacje ZENIT: Crux (system wewnętrzny sieci zenit.stomatologia), stronę, rezerwację online, portal pacjenta, narzędzia raportowe, Kurs na LDEK i wszystko, co powstanie później.

Ten plik mówi, **jak wygląda i jak brzmi** to, co budujemy. Nie zastępuje architektury (`01`, `02`), modelu domeny (`03`) ani prawa (`04`). Szczegóły komponentów Crux są w `06-design-system.md`, a metryki i dashboardy w `11-dashboardy-i-raporty.md`. Jeśli ten plik i `06` mówią co innego o kolorze, kroju lub komponencie, wygrywa `06`. Rozbieżność zgłoś w PR do obu plików.

## 0. Najkrótsza wersja (przeczytaj, nawet jeśli nic więcej)

1. Kolory, odstępy i zaokrąglenia bierzesz **wyłącznie z tokenów** (`tokens.css`). Każdy inny HEX w kodzie to błąd.
2. Krój: **Hanken Grotesk** 400–800, plik lokalny. Liczby zawsze `tabular-nums`.
3. Tło jasne (kość), karty białe, butelkowa zieleń w nawigacji. Na tym opiera się cały interfejs.
4. **Bursztyn (#E9A53A) to słońce.** Wolno go użyć tylko w znaku, wskaźniku „teraz”, obwódce fokusu i kropce w „zenit.”/„crux.”. Bursztyn nie może być tłem, tekstem ani serią danych.
5. Gabinet **01 to Nowodworska** (baza), **02 to Białowieska**. Numer i kolor danych gabinetu są stałe i nie przechodzą na inny gabinet.
6. Analityka to nasza wizytówka. Wykres ma jedną oś, linie 2 px, legendę, etykiety na końcach linii, tooltip i widok tabeli. Nie używamy wykresów kołowych ani dwuosiowych.
7. Model kuleczkowy: gdy coś da się pokazać jako zbiór kropek (zębów), pokazujemy to kropkami (sekcja 6).
8. Ton: krótko, spokojnie, konkretnie. Do pacjenta zwracamy się per Pan/Pani, interfejs personelu jest bezosobowy. Nie używamy wykrzykników, emoji ani słowa „Ups”.
9. Rośliny Köhlera pokazujemy tylko w pustych stanach, na ekranie logowania i na stronie „O Crux” (roślina wydania).
10. Nie używamy różu, motywów tramwajowych, stocków ani niebieskiego „medycznego” światła.

## 1. Dwie marki, jeden system

| | zenit.stomatologia | Crux |
|---|---|---|
| Czym jest | marka sieci gabinetów, widziana przez pacjenta | wewnętrzny system zarządzania siecią, widziany przez personel |
| Znak | łuk zenitu: 16 kuleczek (zębów szczęki) i bursztynowe słońce nad jedynkami | Krzyż Południa: 5 gwiazd jako kuleczki, Ginan w bursztynie, bez linii i łączników |
| Nazwa | „zenit.” + dziedzina | „crux.” |
| Gdzie się pojawia | strona, rezerwacja online, portal pacjenta, SMS, PDF dla pacjenta, druk | pasek boczny Crux, ekran logowania, ikona aplikacji, raporty wewnętrzne |
| Kolory, krój, komponenty | wspólne | wspólne |

Zasada rozdziału: **pacjent nigdy nie widzi marki Crux**. Dokument, SMS lub ekran, który trafia do pacjenta, nosi markę zenit.stomatologia. Crux występuje tylko w narzędziach personelu.

Crux to nazwa gwiazdozbioru Krzyża Południa. Gwiazdy w znaku stoją w prawdziwych pozycjach (J2000), a ich wielkość odpowiada jasności. Złota jest Ginan: najmniejsza gwiazda krzyża i jedyna poza jego osiami, więc znak ma kierunek i nie myli się z plusem. Znak Crux ma jedną wersję we wszystkich rozmiarach. Pełny opis: `crux-ksiega-znaku-1.0.pdf`.

Ten sam system (kolory, krój, model kuleczkowy, zielnik, ton) obejmuje pozostałe przedsięwzięcia ZENIT: Kurs na LDEK i kolejne produkty ZENIT LABS. Każde ma własny znak i nazwę, resztę bierze stąd.

## 2. Pliki i gdzie ich szukać

Folder `Materialy marki/` (dysk wspólny `Zenit Stomatologia`). W repo kopiujemy z niego tylko to, co potrzebne, do `packages/ui/brand/`.

| Potrzebujesz | Plik |
|---|---|
| tokeny CSS (jasny + ciemny) | `tokeny/tokens.css` |
| tokeny dla Tailwind v4 | `tokeny/zenit-theme.tailwind.css` |
| tokeny JSON (Figma, Style Dictionary, natywne aplikacje) | `tokeny/tokens.json` |
| paleta do Adobe | `tokeny/zenit-paleta.ase` |
| font | `font/HankenGrotesk-VF.ttf` (zmienny) lub statyczne 400/600/800 |
| logo zenit | `zenit/logo/<układ>/zenit-<układ>-<kolor>.svg` |
| logo Crux | `crux/logo/<układ>/crux-<układ>-<kolor>.svg` (układy: `znak`, `poziomy`, `poziomy-bez-podpisu`, `krotki`, `nazwa`) |
| geometria znaków do kodu | `geometria/crux-geometria.json`, `geometria/luk-geometria.json` (folder „Crux - dla tworcow aplikacji”) |
| favicony, ikony PWA, manifest | `zenit/ikony/`, `crux/ikony/` |
| numery gabinetów 01, 02 | `zenit/numery-gabinetow/` |
| półłuk ze złotą jedynką | `zenit/motyw-polluk/` |
| ryciny Köhlera (zielnik, 42 tablice) | `ryciny-kohler/svg/` (`currentColor`), `svg-48px/`; katalog i role roślin: `ryciny-kohler/ZIELNIK.md` |
| przykłady wykresów (wzorzec do porównania) | `wykresy-przyklady/*.svg` |

Układy zenit: `lukowy`, `poziomy`, `krotki`, `nazwa`, `znak-pelny`, `znak-kompakt`, `znak-mikro`. Układy Crux: `znak`, `poziomy` (z podpisem „zenit.stomatologia”), `poziomy-bez-podpisu`, `krotki`, `nazwa`.
Kolory plików: `zielen` (na jasnym tle), `krem` (na butelce lub zieleni), `czarny` i `bialy` (jednobarwne, tylko gdy nie da się inaczej).

Wszystkie logotypy mają tekst zamieniony na krzywe. **Nie odtwarzaj logo fontem w HTML.** Zawsze wstawiaj SVG z pliku (`<img>` albo komponent inline), w rozmiarze, który zachowuje proporcje.

## 3. Logo w aplikacji

### Który plik, gdzie

| Miejsce | Plik | Min. rozmiar |
|---|---|---|
| pasek boczny Crux, rozwinięty (232 px) | `crux-poziomy-krem.svg` na `--zenit-butelka` | wysokość 28 px |
| pasek boczny Crux, zwinięty (64 px) | `crux-znak-krem.svg` | 28 px |
| ekran logowania Crux | `crux-poziomy-krem.svg` na butelce, rycina szałwii obok | 58 px |
| favicon Crux | `crux/ikony/favicon.svg` + `favicon.ico` | — |
| nagłówek strony www i rezerwacji | `zenit-poziomy-zielen.svg` (jasny) lub `-krem` (ciemny hero) | wysokość 32 px |
| hero strony | `zenit-lukowy-krem.svg` na butelce | szerokość 200 px |
| nagłówek PDF dla pacjenta | `zenit-poziomy-zielen.svg` | 12 mm wysokości |
| stopka e-mail | `podpis-email/zenit-krotki.png` | wysokość 28 px |
| favicon zenit | `zenit/ikony/favicon.svg` (wersja mikro) | — |

Wersje znaku zenit według rozmiaru:

- **pełna** (16 kuleczek): od 64 px;
- **kompakt** (8 kuleczek): 24–64 px;
- **mikro** (6 kuleczek): 16–24 px.

Znak Crux ma jedną wersję: pięć gwiazd w tej samej geometrii od 16 px w górę. Nie dokładamy łańcuszków kropek, linii krzyża ani dodatkowych gwiazd.

### Zasady

- Pole ochronne: średnica słońca (w Crux: średnica Acrux) z każdej strony. Nic nie wchodzi w to pole.
- Bursztynowe jest tylko słońce (zenit) albo Ginan (Crux) i kropka w nazwie. W `czarny` i `bialy` wszystko ma jeden kolor. Tych wersji używamy wyłącznie tam, gdzie technologia nie pozwala na kolor (grawer, faks, druk jednobarwny).
- Logo nie dostaje cieni, poświaty, gradientów, konturu, obrotu, rozciągnięcia, animowanych efektów ani zmiany koloru kropek.
- Układ łukowy to jedyne miejsce, gdzie „zenit” nie ma kropki, bo tę rolę gra słońce. W każdym zapisie liniowym piszemy „zenit.” z bursztynową kropką.
- Jedyna dozwolona animacja logo to wejście na ekranie logowania: kuleczki pojawiają się kolejno od ósemki do jedynki, a słońce na końcu. W Crux gwiazdy pojawiają się od najjaśniejszej, Ginan ostatni. Trwa ≤ 600 ms, `ease-out`, i musi respektować `prefers-reduced-motion`.

## 4. Gabinety

| Numer | Ulica | Kolor danych (jasny) | Kolor danych (ciemny) |
|---|---|---|---|
| **01** | **Nowodworska** (baza) | `#2F7D45` | `#3E9E57` |
| 02 | Białowieska | `#3A76AC` | `#5089D8` |
| 03 | Kłodzko (plan) | `#C98422` | `#C08526` |
| 04 | Mysłowice (plan) | `#A3533B` | `#9C78CC`, do walidacji |

- W UI zapisujemy numer i nazwę: „01 Nowodworska”. Nie piszemy „nr 1”, „#1” ani „Gabinet 1”.
- Numer zawsze ma dwie cyfry i Hanken 800 z cieniem. Na jasnym tle cyfra jest zielona z cieniem bursztynowym `.05em .05em 0`, na ciemnym bursztynowa z cieniem w kolorze cegły. Komponent: `LocationChip`.
- Kolor danych gabinetu bierze się z `locations.color_key`; pozycja w tablicy go nie zmienia, a filtr ukrywający gabinet nie przemalowuje pozostałych.
- Dane testowe i seedy: `01 Nowodworska`, `02 Białowieska`. Starsze dokumenty mogą mieć odwrotną numerację i należy je poprawić.

## 5. Interfejs: zasady, które łamie się najczęściej

### Kolor

- Proporcje ekranu: kość, biel kart, zieleń, a bursztyn tylko w punktach.
- Tekst główny ma kolor `--text-primary` (butelka), drugorzędny `--text-secondary` (las), a metadane i osie `--text-muted`. Mechu (`#5E7F6A`) nie używamy do tekstu poniżej 18 px, chyba że jest pogrubiony i ma ≥ 14 px.
- Tekst nigdy nie przyjmuje koloru serii danych. Kolor serii niesie kropka lub linia obok tekstu.
- Statusy (`dobrze`, `uwaga`, `poważne`, `krytyczne`) zawsze pokazujemy z ikoną i słowem. Ich kolorów nie wolno użyć jako serii na wykresie.
- Kolornik Z1–Z+ ma te same kolory w terminarzu, planie leczenia, cenniku i na stronie. Na słupkach wykresu jest za jasny. Kategorię oznacza wtedy próbka przy etykiecie, a słupek pozostaje zielony.
- Tryb ciemny ma osobny zestaw wartości z `tokens.css` (`[data-theme="dark"]`). Nie odwracamy kolorów automatycznie.

### Typografia

- Jeden tytuł na ekran: 28/32, waga 800, tracking −0,03 em.
- Wyróżniamy wagą. Nie używamy kursywy ani podkreśleń poza linkami.
- Nagłówki nie kończą się kropką. Nie piszemy całych zdań wersalikami. Wersalikami piszemy tylko etykiety: 11 px, waga 700, +0,12 em.
- Kwoty: `1 234,50 zł` (spacja niełamliwa jako separator tysięcy, przecinek dziesiętny, `zł` po spacji). Procenty: `82%` w UI, `82 %` w dokumentach prawnych. Daty: `14 lutego 2027` w tekście, `14.02.2027` w tabelach. Godziny: `10:30`.

### Kształt i przestrzeń

- Odstępy: 4, 8, 12, 16, 24, 32, 48, 64. Nie używamy innych wartości.
- Zaokrąglenia: 8 (pola, bloki wizyt), 14 (inputy, tooltip), 22 (karty), pełne (przyciski, pigułki statusu, segmenty).
- Karty oddziela tło i obramowanie 1 px w kolorze mgły, bez cieni. Cień dostają tylko tooltip i panel boczny: `0 6px 18px rgba(23,58,42,.12)`.
- Pola dotyku na iPadzie mają min. 44 px. Wiersze tabel: 36 px (gęsty) lub 44 px (zwykły).
- Fokus: obwódka 2 px w bursztynie z odstępem 2 px w kolorze tła. Zawsze widoczna przy nawigacji klawiaturą.

### Ruch

- Przejścia trwają 120–200 ms, `ease-out`. Nie używamy sprężyn, odbić ani konfetti.
- Dane odświeżają się bez migania: stara wartość zostaje, dopóki nie przyjdzie nowa.
- Respektujemy `prefers-reduced-motion`.

## 6. Analityka i model kuleczkowy

Analityka ma być główną cechą naszych aplikacji. Dashboard ma być czytelny w 5 sekund, a po drążeniu ma dawać odpowiedź w 30.

### 6.1 Procedura przy każdym wykresie

1. **Najpierw forma, kolor na końcu.** Ustal, co wykres ma pokazać: wielkość, porównanie gabinetów, zmianę w czasie, udział czy pojedynczą liczbę. Czasem lepszy od wykresu jest kafel KPI z jedną liczbą.
2. **Kolor według zadania:**
   - tożsamość (gabinety): kolory danych gabinetu, w stałej kolejności;
   - wielkość (jedna miara): skala zieleni `--dane-skala-1…7` od szronu do butelki;
   - stan: tokeny statusów z ikoną.
3. **Jedna oś Y.** Dwie miary o różnej skali pokazujemy na dwóch wykresach albo jako indeks (100 = punkt startowy).
4. **Znaki graficzne:** linie 2 px z zaokrąglonymi końcami, słupki z zaokrągleniem 4 px tylko na końcu z danymi, odstęp 2 px między segmentami, kropki ≥ 8 px z pierścieniem w kolorze karty, siatka 1 px `--grid`, oś bez ramki.
5. **Etykiety:** przy ≥ 2 seriach zawsze legenda, a przy ≤ 4 seriach dodatkowo etykieta na końcu każdej linii. Nie umieszczamy liczby przy każdym punkcie. Podpisujemy wartość ostatnią, maksymalną i tę, o której mówi tytuł.
6. **Interakcja:** tooltip po najechaniu i po fokusie. W tooltipie wartość jest pogrubiona i stoi przed nazwą serii. Obszar trafienia jest większy niż sam znak. Na liniach używamy celownika.
7. **Dostępność:** przełącznik „Wykres | Tabela” przy każdym wykresie, `role="img"` z opisem, tożsamość serii nigdy oparta wyłącznie na kolorze.
8. **Linia celu** jest szara, przerywana (`3 3`, `--text-muted`) i podpisana „cel”. Linia odniesienia, np. mediana sieci, to ciągła linia 1 px w kolorze patyny.
9. **Sprawdź na oko.** Zrób zrzut i poszukaj nachodzących etykiet, uciętych podpisów i przepełnień.

### 6.2 Czego nie robimy

Nie używamy wykresów kołowych ani pierścieniowych (zastępuje je siatka kuleczek albo pasek części), wykresów 3D, dwóch osi Y, tęczowych skal, bursztynu w danych, gradientów na słupkach, cieni pod liniami, animowanego wchodzenia wykresów ani liczb przy każdym punkcie.

### 6.3 Model kuleczkowy

Kuleczka to ząb ze znaku. Gdy dana jest policzalna albo ma naturalne „100%”, pokazujemy ją kuleczkami, bo wtedy wykres jest częścią marki.

| Forma | Kiedy | Konstrukcja |
|---|---|---|
| **Łuk obłożenia** | jedna wartość procentowa o dużym znaczeniu (obłożenie foteli, realizacja planu, frekwencja) | 16 kuleczek w kształcie łuku znaku = 100%, jeden ząb = 6,25%. Wypełnienie od lewej ósemki przez jedynki do prawej. Liczba w środku łuku, Hanken 800, w miejscu „zenit”. Pod spodem etykieta. Bez słońca. |
| **Siatka kuleczek** | udział lub liczebność (np. 37 z 50 pacjentów wróciło na recall) | siatka 10 × N, kuleczka = 1 osoba lub 1%. Pełne kuleczki w zieleni, puste w `#DCE4DD`. Zastępuje wykres kołowy. |
| **Wykres kropkowy** | porównanie gabinetów w kilku miarach | wiersz = miara, kropka = gabinet w swoim kolorze, gruba linia porostu łączy min i max, pionowa kreska oznacza medianę sieci |
| **Kalendarz kuleczek** | rytm w czasie (obłożenie dni tygodnia przez kwartał) | kolumna = tydzień, wiersz = dzień pn–sb, kolor kuleczki ze skali zieleni |
| **Sparkline z kropką** | trend w kaflu KPI | linia porostu 2 px, kropka końcowa w kolorze gabinetu lub lasu z pierścieniem w kolorze karty, bez osi |
| **Pasek części** | struktura sumy (przychód wg kategorii) | segmenty ze skali zieleni, odstęp 2 px, zaokrąglenie 4 px, procent w segmencie, gdy się mieści |

Wzorce w SVG: `wykresy-przyklady/luk-oblozenia.svg`, `siatka-kuleczek.svg`, `wykres-kropkowy.svg`, `pasek-czesci.svg`, `wykres-liniowy.svg`, `slupki-poziome.svg`. Implementacja w React: `packages/ui/src/charts/` (`ArchGauge`, `DotGrid`, `DotPlot`, `DotCalendar`, `Sparkline`, `PartsBar`, `LineChart`, `BarList`). Każdy komponent dostaje `TableView`.

Geometria łuku obłożenia nie jest rysowana na oko. Pozycje i promienie 16 kuleczek są wyliczone z konstrukcji znaku. Szerokości zębów w mm to 8,5 · 6,5 · 7,5 · 7,0 · 6,5 · 10,0 · 9,0 · 8,5. Łuk to superelipsa o wykładniku 2,1 i wysokości 1,5 połowy szerokości, a przerwy między kuleczkami są równe. Współrzędne eksportujemy raz do `packages/ui/src/charts/arch-geometry.json` i stamtąd je czytamy.

### 6.4 Kafel KPI

Kafel zawiera kolejno: etykietę (12 px, 600, las), liczbę (30–32 px, 800, tabular) z jednostką (15 px, 700) i sparkline po prawej. Pod spodem jest pigułka zmiany ze słowem i strzałką, np. „▲ 4 pp r/r”, w kolorze `dobrze` albo `uwaga`. O kolorze decyduje znaczenie zmiany: spadek odwołań to dobra wiadomość, więc jest zielony. Kafel prowadzi do drążenia.

### 6.5 Dashboard

Na samej górze jest jeden rząd filtrów (zakres dat, gabinety, wykonawca, kategoria Z) zapisany w URL, a wszystko na stronie reaguje na te same filtry. Pod nim rząd 4 kafli KPI, potem jeden główny wykres na całą szerokość, niżej siatka 2 × N kart. Każda karta ma tytuł, który mówi, co widać („Obłożenie foteli rośnie w 01, stoi w 02”), podpowiedź z definicją metryki i przełącznik „Wykres | Tabela”. Definicje metryk są tylko w `11-dashboardy-i-raporty.md`.

## 7. Komponenty

Pełny inwentarz jest w `06`, sekcja 4. Najważniejsze zasady:

- `Button primary`: zielone tło, kremowy tekst, pełne zaokrąglenie. Na ekran przypada jeden przycisk główny.
- `Button danger`: tekst w kolorze `krytyczne` na białym tle. Nie używamy czerwonych pól.
- `LocationChip`: numer z cieniem i nazwa ulicy.
- `StatusPill`: ikona i słowo, w kolorze tła statusu.
- `EmptyState`: rycina, jedno zdanie i jedno działanie. Przykład: „Brak wizyt w tym dniu. Dodaj wizytę”.
- `Toast`: sam tekst, a przy działaniach odwracalnych przycisk „Cofnij”.
- Formularze: etykieta nad polem, pomoc pod polem, błąd przy polu z informacją, co zrobić. Zapis skrótem `Ctrl+Enter`. Nieudany zapis nie czyści pól.

## 8. Ton i słowa

| Używamy | Unikamy |
|---|---|
| gabinet | klinika |
| lekarz dentysta | stomatolog (w UI), doktor |
| higienizacja | scaling, „czyszczenie” |
| leczenie kanałowe | endo, kanałówka |
| plan leczenia | oferta, kosztorys (w UI pacjenta) |
| wizyta | zabieg (gdy chodzi o termin) |
| pacjent | klient |

Na liście zakazanej są też: „kompleksowo”, „najwyższa jakość”, „bezbolesne”, „uśmiech marzeń”, „hollywoodzki”, „Ups!”, emoji i wykrzykniki.

- Komunikat interfejsu: „Wizyta przeniesiona na 14 lutego, 10:30. Pacjent dostanie SMS.”
- Błąd: „Ten termin koliduje z wizytą na fotelu 2. Wybierz inny fotel lub godzinę.”
- SMS do pacjenta: „Dzień dobry, przypominamy o wizycie w zenit.stomatologia, gabinet 01 Nowodworska, 14 lutego o 10:30. Prosimy o potwierdzenie odpowiedzią TAK.”
- Strona i social media zwracają się do odbiorcy na Ty. Gabinet, dokumenty, SMS i telefon: Pan/Pani.

## 9. Dostępność (minimum, bez wyjątków)

- WCAG 2.2 AA. Kontrast tekstu ≥ 4,5 : 1, dużego tekstu ≥ 3 : 1. Gwarantują to pary z tokenów: butelka/kość 11,3, zieleń/kość 7,2, krem/zieleń 6,3.
- Całość działa z klawiatury, fokus jest widoczny, kolejność fokusu logiczna, `Esc` zamyka panele.
- Każdy wykres ma widok tabeli i tekstowy opis.
- Informacji nie przekazujemy samym kolorem.
- Teksty mają `lang="pl"`. Liczby czyta czytnik ekranu: dla „82%” `aria-label` brzmi „82 procent”.

## 10. Strona i aplikacje dla pacjenta

- Domyślnie kierunek A „Zieleń”: ciemny hero w kolorze butelki, układ łukowy w kremie, numery gabinetów, półłuk wychodzący zza krawędzi. Drugi wariant to kierunek B „Kość”: jasny, z ryciną.
- Rezerwacja online ma jasny ekran z ryciną szałwii i maksymalnie 4 kroki. Cena i czas wizyty są widoczne przed potwierdzeniem.
- Zdjęcia: dzienne światło, prawdziwe wnętrza i zespół. Nie publikujemy zdjęć stockowych, otwartych ust ani zdjęć „przed i po”.
- Ściany i odzież na zdjęciach i wizualizacjach są beżowe. Nigdy różowe.

## 11. Lista kontrolna przed PR (dla ludzi i botów)

- [ ] W diffie nie ma HEX-ów, `px` spoza skali ani `font-family` spoza tokenów.
- [ ] Bursztyn występuje na ekranie najwyżej w znaku, we wskaźniku „teraz” i w obwódce fokusu.
- [ ] Logo pochodzi z pliku SVG, jest w dobrej wersji rozmiarowej i ma zachowane pole ochronne.
- [ ] Gabinety: „01 Nowodworska”, „02 Białowieska”, kolory z `color_key`.
- [ ] Każdy wykres ma jedną oś, legendę (przy ≥ 2 seriach), tooltip, widok tabeli i nie zawiera bursztynu w danych.
- [ ] Wartość procentowa z naturalnym „100%” została rozważona jako łuk obłożenia lub siatka kuleczek.
- [ ] Liczby mają `tabular-nums` i polski format.
- [ ] Teksty przeszły przez listę słów z sekcji 8. Do pacjenta: Pan/Pani, do personelu: forma bezosobowa.
- [ ] Ekran działa w trybie ciemnym, z klawiatury i przy szerokości 768 px (iPad).
- [ ] Zrzut ekranu jest dołączony do PR.

## 12. Dla agentów AI

- Zanim zaczniesz UI, przeczytaj: ten plik, `06-design-system.md`, a przy wykresach także `11-dashboardy-i-raporty.md`.
- Nie wymyślaj nowych kolorów, cieni, zaokrągleń ani krojów. Jeśli czegoś brakuje w tokenach, zatrzymaj się i zaproponuj token w PR do `06` i `tokens.css`.
- Nie generuj logo, ikony marki ani ryciny od zera. Bierz pliki z `Materialy marki/`.
- Nie używaj zdjęć ani wizerunków prawdziwych osób jako placeholderów. Użyj pustego stanu z ryciną.
- Przy każdym wykresie przejdź procedurę z 6.1 i dołącz zrzut.
- Teksty pisz po polsku, jak człowiek: krótkie zdania, konkret, bez marketingowych wypełniaczy.
