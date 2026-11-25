# 08 · Analiza rynku

Wersja 2.0 · 5 listopada 2026. Ceny i funkcje według podlinkowanych źródeł. Sprawdzone bezpośrednio 5.11.2026: IQ Dental, Medfile (Konektor API), Docplanner API, Planmeca Romexis (specyfikacja), Jarvis Analytics, Dentrix Ascend, Open Dental API, 3Shape Unite, Supabase. Pozostałe wiersze pochodzą z wersji 1.0 (źródła podlinkowane, sprawdzone w październiku i listopadzie 2026 przy pisaniu wersji 1.0) i mają status „do odświeżenia przed decyzją”. Pozycje „(wiedza ogólna)” nie były weryfikowane w źródle.

## 1. Wniosek w trzech zdaniach

1. **Polskie programy gabinetowe są tanie (kilkaset złotych miesięcznie za kilka stanowisk) i dojrzałe klinicznie oraz w P1, ale żaden nie jest zbudowany wokół sieci gabinetów i właściciela.** Wielogabinetowość to u nich dopłata do licencji, bez wspólnego modelu danych; analityka kończy się na raportach sprzedaży.
2. **Światowe systemy chmurowe (Dentrix Ascend + Jarvis, CareStack, Curve, Open Dental z ekosystemem) pokazują, jak wygląda zarządzanie siecią: pulpity zależne od roli, lejek niezrealizowanego leczenia, odprawa poranna, raport końca dnia, rankingi wykonawców, otwarte API.** To jest poziom, do którego równa Crux.
3. **Crux nie wygra na liczbie funkcji klinicznych i nie musi.** Wygrywa tym, czego nikt nie daje naraz dla czterech gabinetów w Polsce: jedna baza pacjentów sieci, terminarz sieci, rozliczenia lekarzy, lejek planów leczenia, dashboardy właściciela i marka w każdym kontakcie z pacjentem. Część kliniczną i P1 dokładamy w F4 na własnych warunkach.

## 2. Polska: programy gabinetowe

### 2.1 Tabela porównawcza

| Program | Model | Cena (źródło) | Mocne strony | Słabości z perspektywy sieci zenit.stomatologia |
|---|---|---|---|---|
| [IQ Dental](https://iqdental.pl/cennik/) (Optident) | chmura, hosting AWS, dostęp z przeglądarki i telefonu | pakiet **FULL**: 127 zł brutto/mies. za 1 użytkownika, 304 zł za 4, 610 zł za 10, 708 zł za 12 (umowa roczna; przy 3- i 5-letniej taniej, np. 12 użytkowników 648 zł/mies. przy 5 latach); pakiet **EDM**: 84 zł za 1, 204 zł za 4, 410 zł za 10 użytkowników; każdy kolejny użytkownik powyżej 12: +54 zł (FULL) lub +33 zł (EDM); konta pacjentów, rejestracji i asystentek bezpłatne; wdrożenie, migracja bazy i szkolenie w cenie; 14 dni próbnych | nowoczesny interfejs, 120 animacji edukacyjnych dla pacjenta, „aktywna poczekalnia”, automatyczny plan leczenia, lista oczekujących, panel pacjenta i rejestracja online, delegowanie zadań, kategoria „sieci gabinetów” w ofercie | cennik liczony per użytkownik, więc sieć 4 gabinetów z 20 osobami personelu to rząd 1 100 zł/mies. przy FULL; strona nie opisuje integracji (P1, RTG, ZnanyLekarz, kasa) ani API; brak publicznej dokumentacji eksportu danych; analityka właścicielska nieopisana |
| [Prodentis](https://medeq.pl/blog/prodentis-vs-estomed-porownanie-2026) | desktop, licencja per stanowisko | ok. 850 zł brutto za stanowisko rocznie (licencja roczna) | głęboka część kliniczna i obrazowa, e-recepta, NFZ; aplikacja [ProDentis lekarz](https://apps.apple.com/pl/app/prodentis-lekarz/id1537072012) | architektura stanowiskowa; sieć gabinetów wymaga infrastruktury serwerowej i VPN; brak otwartego API (wiedza ogólna) |
| [Estomed](https://estomed.pl/cennik/) | licencja dożywotnia + abonament, hybryda | 2 000–3 000 zł za stanowisko + 73–94 zł/mies. | od 2003 r., EDM/P1 w wersji podstawowej, terminarz i rozliczanie lekarzy od wersji Ultimate, moduł fiskalny w Gold | serwer lokalny; rejestracja online wymaga stałego IP; wielogabinetowość przez wspólny serwer, bez wspólnego modelu danych |
| [FELG Dent](https://www.capterra.com/p/10011736/FELG-Dent/) | chmura, web + iPad + Android | Standard 80 €/mies. (1 gabinet, 3 lekarzy), Premium 150 €/mies. (2 gabinety, 5 lekarzy, +19 €/gabinet) | od początku w chmurze; obsługa wielu gabinetów w abonamencie; kalendarz ZnanyLekarz; przeglądanie RTG (DICOM 2D) na iPadzie | płytsza analityka właścicielska (wiedza ogólna); ograniczenia liczby lekarzy w pakietach |
| [Medfile](https://www.medfile.pl/cennik) (Biostat) | chmura, ogólnomedyczny | 0 zł (40 wizyt/mies.), Plus 119 zł, Premium 179 zł/mies. + 79–89 zł za użytkownika | pełne EDM; **[Konektor API EDM](https://www.medfile.pl/api-erecepta-ezla)** dla zewnętrznych producentów: e-recepta, e-skierowanie, eZLA, eWUŚ, zdarzenia medyczne P1, repozytorium XDS.b, baza leków, ICD-9/10, REST/JSON + XML (FHIR, CDA), Swagger/OpenAPI 3; bez konta Medfile; środowisko testowe po NDA; produkcja po umowie, z listą IP lub VPN; cena na zapytanie | ogólnomedyczny, diagram zębowy uproszczony; jako program gabinetowy nie dla nas, jako bramka P1 kandydat numer jeden (ADR-011) |
| [MyDr EDM](https://dentalsupplierguide.com/pl/artykuly/medfile-vs-mydr-edm/) | chmura, ogólnomedyczny | 0 zł (10 wizyt), 129 zł lub 339 zł za 30 dni | prosty start, P1 | nie jest programem stomatologicznym |
| SmartDental (KS-PPS), Aurero, Dr100 | desktop i hybrydy | brak publicznych cenników ([przegląd TPS](https://dlaspecjalistow.pl/pl/p/file/fa1741fce0b154c01783ce61373113b5/TPS_2021_6_str.63-68.pdf)) | klasyczne programy stomatologiczne | jak Prodentis |
| [MedEQ](https://medeq.pl/blog/prodentis-vs-estomed-porownanie-2026) | chmura, abonament za gabinet | na zapytanie | nowoczesny interfejs, nacisk na zarządzanie | sprawozdawczość NFZ w budowie; młody produkt |
| [Dentalpin](https://www.dentalpin.com/pl/blog/dentalpin-vs-estomed/) | open source (BSL 1.1), od 2026 | 0 zł przy samodzielnym hostingu | otwarty kod: można podejrzeć model danych i podejście do P1 | bardzo młody, brak historii wdrożeń; licencja BSL ogranicza użycie komercyjne (sprawdzić) |
| [Medidesk](https://www.hauerpower.com/blog/znanylekarz-pro-czy-medidesk) | nakładka recepcyjna | od 705 zł netto/mies. (AI od 1 510 zł) | obsługa telefonów, rejestracja, asystent AI | nie jest programem gabinetowym; wymaga integracji |
| [ZnanyLekarz Pro](https://www.hauerpower.com/blog/znanylekarz-pro-czy-medidesk) | kalendarz + pozyskanie pacjentów | od 14,65 zł netto dziennie za profil (min. 3 profile) | ruch pacjentów, rezerwacje online, opinie | kanał pozyskania pacjentów; dane pacjentów częściowo u dostawcy; integracja kalendarza przez [Docplanner Integrations API](https://docplanner.github.io/integrations-hub-front-app/guide/) dostępna wyłącznie dla producentów oprogramowania medycznego |

### 2.2 Co to znaczy dla Crux

- **Koszt gotowca dla sieci** (4 gabinety, ok. 16 stanowisk, ok. 20 użytkowników): IQ Dental FULL ok. 1 100 zł brutto/mies. (13 200 zł/rok) w umowie rocznej; Prodentis ok. 13 600 zł/rok licencji + serwer i VPN; FELG Dent Premium 150 € + 2 × 19 € = 188 €/mies., ale z limitem lekarzy. Do tego osobno: ZnanyLekarz Pro (min. 3 profile ≈ 1 300 zł netto/mies.), SMS, ewentualnie Medidesk. **Rząd wielkości: 25–45 tys. zł rocznie** za komplet narzędzi, które dalej nie dają jednego obrazu sieci.
- **Crux nie konkuruje ceną licencji.** Konkuruje odzyskanym przychodem (recall, lejek planów, nieobecności) i czasem zarządu. Koszt infrastruktury Crux (sekcja 6 w `01-architektura.md`) to rząd 1 000–2 500 zł/mies., koszt wytworzenia to głównie czas Miłosza i Cursora.
- **Czego nauczyć się od IQ Dental:** animacje edukacyjne dla pacjenta i „aktywna poczekalnia” to dobre pomysły na F6 (portal pacjenta, ekran w poczekalni). Nie kopiujemy ich teraz.
- **Czego nauczyć się od Medfile:** rozdzielenie „programu” od „bramki P1” to dokładnie nasz ADR-011. Konektor API Medfile sprawdzić komercyjnie w F0 (zapytanie ofertowe, NDA, dostęp do środowiska testowego).

## 3. Świat: systemy chmurowe i analityka sieci

| Program | Producent | Model | Co warto podejrzeć (ze źródła) |
|---|---|---|---|
| [Dentrix Ascend](https://www.dentrixascend.com/dental-solutions/practice-data-and-analytics/dentrix-ascend-profitability-insights-suite/) | Henry Schein One | chmura | **Profitability Insights Suite** oparty na Jarvis Analytics: pulpit wyników wielu gabinetów z widokami dla menedżera regionu, konsultanta i wykonawcy; KPI: akceptacja planów, leczenie zaplanowane vs niezaplanowane, retencja pacjentów, ponowne umówienie higienizacji, produkcja vs wpływy, produkcja na wizytę, trend wpływów; drążenie od wykresu do rekordów; dostęp do modułów wg roli |
| [Jarvis Analytics](https://jarvisanalytics.com/) | Jarvis (Henry Schein One) | analityka nad dowolnym PMS | biblioteka „50+ KPI” dla gabinetu, lekarza, higieny i specjalizacji; moduły: **Snapshot** (produkcja i wpływy vs cele), **Morning Huddle** (odprawa poranna), **End of Day** (automatyczny raport e-mail), **Treatment Miner** (niezrealizowane plany: zaplanowane i niezaplanowane), **Practice Potential** (recall higieny, akceptacja planów, retencja, wpływy), **Aging** (należności wg wieku), **Payroll** (rozliczenia wykonawców), **Scorecards** (20% najlepszych i najsłabszych), **Marketing Matchback**; integracje z Dentrix, Open Dental, Eaglesoft, Denticon, Cloud 9 |
| [CareStack](https://carestack.com/dental-software/compare/carestack-vs-curve-dental) | CareStack | chmura dla sieci (DSO) | wiele podmiotów i cenników w jednej instancji, rozliczenia, portal pacjenta, pulpity analityczne; uważany za rozbudowany, dla małych gabinetów bywa za ciężki ([porównanie Curve](https://www.curvedental.com/blog/is-carestack-too-complex)) |
| [Curve Dental](https://www.curvedental.com/blog/carestack-vs-curve-dental) | Curve Dental | chmura | obrazowanie wbudowane, dwukierunkowe SMS, raporty własne, prostota wdrożenia |
| [Open Dental](https://www.opendental.com/site/apisetup.html) | Open Dental | desktop open source + hosting | **otwarte API** (nagłówek `ODFHIR {DeveloperKey}/{CustomerKey}`, tryby Local / Service / Remote przez eConnector, uprawnienia per zasób, zdarzenia webhook), otwarta baza do własnych raportów SQL, największa biblioteka mostów do sprzętu, w tym [most Planmeca Romexis](https://www.opendental.com/manual/bridgeplanmeca.html) |
| tab32, Eaglesoft, Cloud 9, Planet DDS Denticon | różni | chmura / hybryda | architektura wielogabinetowa (tab32, Denticon), wykres periodontologiczny (Eaglesoft), ortodoncja (Cloud 9) (wiedza ogólna) |
| Dentally | Henry Schein One | chmura (Wielka Brytania) | prostota, rezerwacje online, komunikacja z pacjentem; integracja z 3Shape Unite ([lista integracji Unite](https://learn.3shape.com/en/support/all-products/3shape-unite/connections--integrations-in-unite)) |
| CGM Z1, Dampsoft DS-Win | CompuGroup, Dampsoft | desktop (Niemcy) | standard **VDDS-media** łączący programy gabinetowe z obrazowaniem; 3Shape Unite ma interfejs VDDS (wiedza ogólna co do Romexis) |
| Dental Intelligence, NexHealth, Weave | różni (USA) | analityka / warstwa API / komunikacja | wzorce: alerty dzienne dla zespołu, warstwa API nad wieloma PMS, dwukierunkowa komunikacja z pacjentem (wiedza ogólna) |

### 3.1 Obrazowanie i skanery (do F5, szczegóły w `12-obrazowanie-dicom.md`)

- [Planmeca Romexis](https://inte.planmeca.com/jaSoftware/specifications): DICOM jako **płatne pakiety dodatkowe**: „DICOM Storage” (Storage SCU, Print SCU), „DICOM Full” (dodatkowo Worklist SCU, Query/Retrieve SCU, Storage Commitment, MPPS), „DICOM PACS” (dodatkowo Storage SCP i Q/R SCP). Import DICOM i STL, eksport DICOM, STL, OBJ, PLY; Romexis Cloud do przesyłania przypadków między instalacjami; Romexis Insights do monitoringu urządzeń z wielu lokalizacji. Most do programów gabinetowych (PmBridge, `DxStart.exe`) opisany w [instrukcji Open Dental](https://www.opendental.com/manual/bridgeplanmeca.html) i [deklaracji zgodności DICOM Romexis 6.1](https://inte.planmeca.com/globalassets/planmeca-modernization/software/downloads/dicom_conformance_statement_romexis_6_1.pdf).
- [3Shape Unite](https://learn.3shape.com/en/support/all-products/3shape-unite/connections--integrations-in-unite): dziesiątki integracji z PMS (Dentrix, Open Dental, Dentally, CareStack, axiUm…), w Unite Store aplikacje: Command Line Interface, VDDS interface, Web Service interface. To trzy drogi, którymi Crux może odbierać skany TRIOS.
- Medit Link (Medit), DEXIS / DTX Studio, Sidexis (Dentsply Sirona), CS Imaging (Carestream), VistaSoft (Dürr): wiedza ogólna, do sprawdzenia po spisie sprzętu w gabinetach (zadanie F0).

## 4. Co bierzemy od kogo

| Wzorzec | Skąd | Jak w Crux (dokument) |
|---|---|---|
| Pulpity zależne od roli, jeden obraz sieci, widoki regionalne | Dentrix Ascend, Jarvis, CareStack | Pulpit sieci / gabinetu / lekarza (`11-dashboardy-i-raporty.md`) |
| Odprawa poranna i raport końca dnia | Jarvis Morning Huddle, End of Day | „Przegląd 60 sekund” i „Koniec dnia” (`11`, sekcje 4 i 5) |
| Niezrealizowane leczenie jako lejek i lista do dzwonienia | Jarvis Treatment Miner, Dentrix „scheduled vs unscheduled” | metryki `plan_open_value`, `plan_unscheduled_items`, lista „Plany do domknięcia” (`11`) |
| Rankingi wykonawców z ostrożnością (20/20) | Jarvis Scorecards | tabela lekarzy z medianą sieci jako punktem odniesienia, bez publicznego rankingu w gabinecie (`11`, sekcja 7) |
| Otwarte dane do własnych raportów, uprawnienia per zasób | Open Dental API | schemat `analytics` z dokumentacją, eksport CSV każdej tabeli, klucze API per integrator (F6) |
| Biblioteka mostów do sprzętu | Open Dental | lokalny agent `apps/bridge` z adapterami (`12`) |
| Chmura + iPad przy fotelu | FELG Dent | aplikacja webowa dopracowana pod iPada (pola 44 px, podpis na ekranie) |
| P1 przez API bramki | Medfile Konektor API | port `P1Gateway` (ADR-011, `05-integracje.md`) |
| Edukacja pacjenta, aktywna poczekalnia | IQ Dental | F6: portal pacjenta, ekran poczekalni |
| Kolornik usług w terminarzu, numery gabinetów | własne (księga znaku) | wyróżnik wizualny, którego nie ma nikt (`06-design-system.md`) |
| Rozliczenia lekarzy kontraktowych z potrąceniami laboratorium | Estomed Ultimate (podstawowo), Jarvis Payroll | pełny moduł w F2 |

## 5. Gdzie Crux będzie słabszy i to akceptujemy

- Liczba funkcji klinicznych na starcie (periodontologia, ortodoncja zaawansowana, chirurgia, implantologia) mniejsza niż w Prodentisie czy Estomedzie. Dokładamy według potrzeb lekarzy po F4.
- Dojrzałość P1: zależymy od bramki pośredniczącej i jej SLA. Plan B: integracja natywna, plan C: gabinet.gov.pl ręcznie.
- Wsparcie 24/7: nie mamy działu wsparcia. Kompensujemy prostotą, procedurą awaryjną (`01`, sekcja 13) i tym, że system jest nasz.
- Sprawozdawczość NFZ: nie budujemy, dopóki nie ma kontraktu.

## 6. Ryzyko „zbuduj zamiast kup” w liczbach

| Pozycja | Gotowiec (rocznie) | Crux (rocznie) |
|---|---|---|
| Licencje programu gabinetowego | 13–20 tys. zł | 0 zł |
| Infrastruktura (chmura, SMS, bramka P1, serwer workera) | w cenie / osobno SMS | 12–30 tys. zł (rośnie z F4 i F5) |
| Czas wytworzenia | 0 | ok. 12–18 miesięcy pracy Miłosza z Cursorem plus programista od F1 i prawnik na godziny |
| Ryzyko | zależność od dostawcy, brak obrazu sieci | ryzyko projektowe, kompensowane dokumentacją i bramkami faz (`07-roadmapa.md`) |

Crux musi to przebić wartością: miary sukcesu w `00-wizja-i-zasady.md`. Decyzja o budowie zapadła (listopad 2026); ten dokument służy do tego, żeby wiedzieć, z czym się porównujemy i co przejmujemy.
