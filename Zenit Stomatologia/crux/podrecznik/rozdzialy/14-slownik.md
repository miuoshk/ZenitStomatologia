# 14 · Słownik, skróty i mapa plików

## 14.1 Pojęcia 1.0 (PL ↔ EN)

| Po polsku | W kodzie | Znaczenie |
|---|---|---|
| podmiot leczniczy | `tenant` | administrator danych; właściciel bazy pacjentów (od 1.1) |
| gabinet | `location` | `01 Nowodworska`, `02 Białowieska`; numer i kolor danych są stałe |
| fotel | `chair` | zasób, na którym odbywa się praca; ma wyposażenie i kolejność |
| godziny otwarcia, wyjątek | `opening_hours`, `opening_exceptions` | tygodniowy wzorzec i dni szczególne |
| personel, członkostwo | `staff_member`, `membership` | osoba z kontem; przypisanie do gabinetu z rolą i okresem |
| wykonawca | `provider` | lekarz dentysta albo higienistka wykonujący świadczenie; filtr `wykonawca` |
| uprawnienie | `permission` | czynność jako dana, np. `occupancy.write` |
| wpis obłożenia | `chair_occupancy` / `OccupancyEntry` | godzina pracy fotela: wykonawca, kategoria, kwota; bez pacjenta |
| blokada czasu | `time_block` | fotel niedostępny (serwis, zamknięcie, szkolenie); od 1.1 także wykonawca |
| zamknięcie dnia | `occupancy_day_closure` | potwierdzenie kompletności wpisów dnia w gabinecie |
| tryb obłożenia | `occupancy_mode` | `manual` (1.0) albo `appointments` (po przejściu na terminarz) |
| kategoria usługi, kolornik | `service_category` Z1…Z+ | Z1 przegląd i plan, Z2 higienizacja, Z3 wypełnienia, Z4 leczenie kanałowe, Z5 korony i licówki, Z+ ortodoncja nakładkowa |
| pojemność fotela | `fact_chair_capacity` | minuty otwarcia minus blokady, per fotel i dzień |
| obłożenie | `chair_utilization` | minuty wpisów ÷ dostępne minuty |
| rejestr metryk | `metricRegistry` | definicje metryk jako kod z testem i drążeniem |
| drążenie | `drilldown` | lista rekordów, z których powstała liczba |
| zestaw wzorcowy | `golden` | deterministyczne dane testowe z oczekiwanymi wartościami metryk |
| outbox | `platform.outbox` | zdarzenia do wysłania zapisane w transakcji komendy |
| aktor, claims | `Actor`, `request.jwt.claims` | kto wykonuje operację: osoba, tenant, gabinety, rola, uprawnienia |
| wydanie | `release` | numerowana wersja wdrożona w gabinetach, z nazwą rośliny |
| bramka | — | mierzalny warunek zamknięcia wydania, sprawdzany w gabinecie |
| strażnik | — | automat, który łamie się głośno: lint, pgTAP, `crux-doctor`, dependency-cruiser |

Zakazane synonimy (strażnik `code.vocabulary`): `visit`, `clinic`, `branch`, `customer`, `client`, `doctor` (jako rola), `bill`, `slot` (jako encja).

## 14.2 Skróty

| Skrót | Znaczenie |
|---|---|
| `1.0`, `1.1`, `2.0`… | wydania Crux: Krasnodrzew, Ratania, Pięciornik, Cynamonowiec, potem 3.0, 4.0, 5.0 |
| „P1” w rozmowie | pierwsza wersja Crux = wydanie 1.0; w dokumentach „P1” = Platforma P1 (e-zdrowie, CeZ) |
| `F0`…`F6` | fazy: zakres funkcjonalny, porządek specyfikacji i promptów |
| `F0-010` | specyfikacja; `AC5` jej kryterium; `[F0-010/AC5]` w teście |
| `K01`…`K17` | prompty dla Cursora w obrębie fazy; części = commity |
| `E0.7`, `M0`…`M6` | epik w roadmapie, kamienie milowe |
| ADR-0XX | decyzja architektoniczna w `docs/02` |
| RLS | row level security: polityki w bazie per wiersz |
| MFA, TOTP | drugi składnik logowania: kod z aplikacji |
| PITR | odtworzenie bazy do dowolnej minuty |
| DPIA, DPA | ocena skutków dla ochrony danych; umowa powierzenia |
| EDM, CeZ | elektroniczna dokumentacja medyczna; Centrum e-Zdrowia |
| pgTAP | testy w bazie (izolacja tenantów i gabinetów) |
| `doctor` | `crux-doctor`, zestaw reguł sprawdzanych w CI |

## 14.3 Mapa plików folderu `crux`

| Plik | Po co | Kiedy czytać |
|---|---|---|
| `README.md` | mapa folderu, słownik skrótów, start dla nowego czatu | na początku |
| `AGENTS.md` | twarde zasady dla każdego agenta AI | zawsze; Cursor czyta automatycznie |
| `docs/00-wizja-i-zasady.md` | po co, zasady, czego nie robimy, miary sukcesu, miary 1.0 | start każdego dużego tematu |
| `docs/01-architektura.md` | stos, moduły, przepływy, sieć jako jeden organizm, środowiska, koszty, NFR | przed każdą nową funkcją |
| `docs/02-decyzje-architektoniczne.md` | ADR-001…033 | gdy chcesz coś zmienić w stosie lub wzorcu |
| `docs/03-model-domeny.md` | słownik, agregaty (w tym ChairOccupancy), niezmienniki, kolornik, FHIR, macierz ról (sekcja 8) | przed zmianą w bazie i uprawnieniach |
| `docs/03a-schemat-bazy.md` | tabele na poziomie DDL (5.1 obłożenie, 12.1 analityka 1.0), wzorce RLS, retencja | przy każdej migracji |
| `docs/04-prawo-i-bezpieczenstwo.md` | RODO, dokumentacja, EDM, Platforma P1, KSeF, MDR, EHDS, Supabase; 5a: co zmienia 1.0 | przed wszystkim, co dotyka danych |
| `docs/05-integracje.md` | Platforma P1 (bramka Medfile), SMS, ZnanyLekarz, Optima, fiskalna, import | od 1.1 |
| `docs/06-design-system.md` | tokeny z pakietu marki, znak Crux, komponenty, anatomia kafla i karty, model kuleczkowy, ton, rozbieżności z `14` | przed każdym ekranem |
| `docs/07-roadmapa.md` | tory, wydania z bramkami, fazy, epiki, 1.0 tydzień po tygodniu, ryzyka | planowanie |
| `docs/08-analiza-rynku.md` | IQ Dental, Prodentis, Estomed, FELG, Medfile; Dentrix/Jarvis, CareStack, Curve, Open Dental; Romexis, 3Shape | decyzje produktowe |
| `docs/09-konwencje-kodu.md` | struktura repo, nazewnictwo, wzorce, testy, strażnicy, zależności | przy każdym PR |
| `docs/10-praca-z-ai.md` | cykl funkcji, szablony promptów, Cursor, sygnały ostrzegawcze, ledger | przy każdym prompcie |
| `docs/11-dashboardy-i-raporty.md` | pulpity, filtry, rejestr metryk, formy, metryki i pulpity 1.0 (4.7, 5.7), drążenie | przed każdą metryką |
| `docs/12-obrazowanie-dicom.md` | Romexis, Orthanc, DICOMweb, worklist, agent, MDR | 4.0 |
| `docs/13-backlog-specyfikacji.md` | lista specyfikacji ze statusem i wydaniem | planowanie, śledzenie |
| `docs/14-guideline-aplikacji.md` | zasady marki dla wszystkich aplikacji sieci, lista kontrolna PR | przed każdym ekranem, razem z `06` |
| `docs/specs/` | specyfikacje; 1.0: F0-010, F0-011 | przed implementacją |
| `prompts/F0-fundament.md` | prompty 1.0 (K01–K17) | przy implementacji 1.0 |
| `prompts/F1…F5` | prompty kolejnych wydań | później |
| `prompts/ledger.md` | pamięć projektu: co zastosowano, co odrzucono, dług | zawsze na starcie czatu |
| `.cursor/rules/` | reguły Cursora | Cursor sam |
| `design/crux-dashboard-prototyp.html` | prototyp układu pulpitu | referencja |
| `manifest/` | manifest dla zespołu (PDF, plansze, makiety, źródła) | do pokazania innym |
| `podrecznik/` | ten podręcznik: rozdziały, rysunki, `build.py`, wyniki | na start i przy każdym kroku |
| `../Materialy marki/`, `../Crux - dla tworcow aplikacji/` | pakiet marki (poza repo) | K08, każda zmiana tokenów |

## 14.4 Jak zbudować ten podręcznik ponownie

```
cd crux
python3 podrecznik/build.py            # PODRECZNIK-CRUX-1.0.md + .html (zawsze), .pdf (gdy jest Chromium/Playwright)
python3 manifest/zrodla/makiety/generuj.py && node manifest/zrodla/render.js all   # makiety, manifest PDF i plansze
```

Rysunki w `podrecznik/rysunki/*.mmd` są renderowane do SVG, jeśli w systemie jest `mmdc` (`npm i -g @mermaid-js/mermaid-cli`); bez niego podręcznik `.md` ma bloki ```mermaid, które Cursor i GitHub renderują same.
