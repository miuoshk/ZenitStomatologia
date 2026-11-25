# 04 · Prawo i bezpieczeństwo

Wersja 2.1 · 6 listopada 2026. Mapa obowiązków przełożonych na wymagania systemu; opinia prawna jest osobnym dokumentem. Pozycje **[do potwierdzenia]** wymagają prawnika przed wdrożeniem fazy, której dotyczą. Źródła sprawdzone 5.11.2026 są podlinkowane; pozycje bez linku pochodzą z wiedzy ogólnej i mają status „sprawdzić przed fazą”.

## 1. Kim jesteśmy w rozumieniu prawa

| Rola | Kto | Skutek dla Crux |
|---|---|---|
| Administrator danych (RODO) | podmiot leczniczy prowadzący gabinety (tenant) | decyduje o celach, odpowiada za dokumentację i za wybór dostawców |
| Podmiot przetwarzający | Supabase, Vercel, dostawca serwera workera, magazyn plików, bramka SMS, bramka P1, Sentry, dostawca LLM (F6) | umowa powierzenia z każdym, rejestr podprzetwarzających, przegląd raz w roku |
| Twórca i operator systemu | ZENIT LABS lub spółka zarządzająca siecią **[do potwierdzenia, kto formalnie]** | jeśli inna spółka niż podmiot leczniczy: też podmiot przetwarzający; potrzebna umowa licencyjna, umowa powierzenia i podział odpowiedzialności |
| Producent systemu EHR (EHDS) | prawdopodobnie twórca systemu, także przy użyciu wewnętrznym **[do potwierdzenia]** | obowiązki producenta z rozdziału III EHDS (sekcja 2, wiersz EHDS) |

## 2. Źródła prawa i co z nich wynika dla systemu

| Przepis | Co nakazuje | Jak to realizuje Crux | Faza |
|---|---|---|---|
| Ustawa o prawach pacjenta i Rzeczniku Praw Pacjenta, art. 23–30 | prowadzenie, przechowywanie, udostępnianie dokumentacji; **20 lat** od końca roku ostatniego wpisu; zdjęcia RTG przechowywane poza dokumentacją indywidualną: 10 lat | tabele kliniczne tylko dopisywane (ADR-008), `retention_until` liczone automatycznie, rejestr udostępnień, eksport | F4 |
| [Rozporządzenie MZ z 6.04.2020 w sprawie rodzajów, zakresu i wzorów dokumentacji medycznej oraz sposobu jej przetwarzania (Dz.U. 2020 poz. 666)](https://api.sejm.gov.pl/eli/acts/DU/2020/666/text.html), § 1 ust. 1–3 | dokumentacja w postaci elektronicznej; dany dokument nie może być prowadzony jednocześnie w dwóch postaciach | Crux jest jedynym systemem dokumentacji od F4 (strangler fig, ADR-013); do F4 dokumentację prowadzi obecny program | F4 |
| to samo, **§ 1 ust. 5** | podmiot: systematyczne szacowanie ryzyka, udokumentowane procedury zabezpieczania, środki adekwatne do zagrożeń „uwzględniające najnowszy stan wiedzy”, aktualizacja oprogramowania, bieżąca kontrola zabezpieczeń, plany przechowywania długoterminowego (w tym przenoszenie na nowe nośniki i formaty) | analiza ryzyka w DPIA, procedury w `docs/ops/` (F0), CI ze skanowaniem zależności, przegląd kwartalny, plan migracji formatów w ADR-021 | F0 |
| to samo, **§ 1 ust. 6 pkt 1–8** | system teleinformatyczny zapewnia: (1) integralność treści i metadanych, zmiany tylko w ramach udokumentowanych procedur; (2) stały dostęp dla uprawnionych, zabezpieczenie przed nieuprawnionymi; (3) identyfikację osoby sporządzającej, dokonującej wpisu lub zmiany i zakres zmiany; (4) czas sporządzenia, wpisu i zmiany; (5) cechy informacyjne dokumentów wg § 10 pkt 3; (6) prowadzenie i udostępnianie w formatach wydanych na podstawie art. 11 ustawy o SIOZ, a w ich braku HL7 i DICOM; (7) wydruk; (8) **eksport całości danych** w standardach z pkt 6, umożliwiający odtworzenie w innym systemie | sekcja 3 tego dokumentu: mapa punkt po punkcie | F4 |
| to samo, **§ 4 ust. 1–4** | wpis niezwłocznie po świadczeniu, z niezaprzeczalnością i integralnością; wpis i zmiana oznaczone osobą (imię, nazwisko, NPWZ, podpis); podpis dokumentacji elektronicznej: kwalifikowany, zaufany, osobisty albo sposób ZUS; **dokumentacja wewnętrzna może być podpisana także „przy wykorzystaniu wewnętrznych mechanizmów systemu teleinformatycznego”** | „podpis wewnętrzny Crux” (sekcja 4) dla dokumentacji wewnętrznej; podpis kwalifikowany lub certyfikat ZUS tylko dla dokumentów EDM wysyłanych do P1 | F4 |
| to samo, § 3 | udostępnianie dokumentacji między podmiotami za pomocą środków komunikacji elektronicznej w 7 dni od wytworzenia (z wyjątkami) | eksport karty pacjenta (PDF + XML/CDA) i rejestr udostępnień | F4 |
| [Rozporządzenie MZ w sprawie rodzajów elektronicznej dokumentacji medycznej (t.j. Dz.U. 2021 poz. 1153)](https://eli.gov.pl/api/acts/DU/2021/1153/text.html), § 1 pkt 1–5 | EDM to: informacja o rozpoznaniu, wynikach, świadczeniach i zaleceniach (pkt 1), informacja dla lekarza kierującego (pkt 2), karta informacyjna ze szpitala (pkt 3), wyniki badań laboratoryjnych z opisem (pkt 4), **opis badań diagnostycznych innych niż laboratoryjne (pkt 5)** | **opis zdjęcia RTG, pantomogramu lub CBCT wykonany w gabinecie jest EDM**: dokument HL7 CDA, podpisany (certyfikat ZUS lub kwalifikowany), zaindeksowany w P1. Odpowiedź na pytanie otwarte nr 7 z wersji 1.0: tak | F4 |
| Ustawa o systemie informacji w ochronie zdrowia, art. 56 ([omówienie mp.pl](https://www.mp.pl/ezdrowie/baza-wiedzy/282602,edm-pytania-i-odpowiedzi)) | raportowanie **zdarzeń medycznych** do P1 i indeksowanie EDM od 1.07.2021, także przez podmioty komercyjne bez NFZ i praktyki indywidualne; e-recepta, e-skierowanie | port `P1Gateway` przez bramkę (ADR-011); do F4 robi to obecny program; awaryjnie gabinet.gov.pl | F4 |
| RODO art. 9 ust. 2 lit. h, art. 30, 32, 33–35, rozdział V | podstawa dla danych o zdrowiu; rejestr czynności; środki techniczne; naruszenia w 72 h; DPIA; transfery poza EOG | sekcje 5–6; DPIA przed F1 i aktualizacja przed F4; SCC + TIA dla Supabase i Vercel | F0 |
| Prawo komunikacji elektronicznej (od 10.11.2024) | marketing SMS i e-mail tylko za uprzednią zgodą | rejestr zgód z treścią, datą, kanałem, sposobem wycofania; przypomnienia o wizycie to komunikacja w ramach usługi; recall **[do potwierdzenia, czy wymaga zgody]** | F1, F3 |
| Ustawa o VAT, kasy rejestrujące online | ewidencja sprzedaży usług dla osób fizycznych na kasie | paragon z kasy; numer paragonu przy płatności; od F3 wydruk przez lokalny agent | F2 |
| [KSeF](https://jpk.info.pl/faktury/e-faktura-ustrukturyzowana-ksef/harmonogram/) | obowiązkowe e-fakturowanie: od 1.02.2026 duzi podatnicy, **od 1.04.2026 pozostali (czynni i zwolnieni z VAT)**, od 1.01.2027 mikroprzedsiębiorcy; sankcje od 1.01.2027 | faktury B2B wystawia Comarch Optima (w KSeF) na podstawie eksportu z Crux; faktury dla konsumentów na żądanie poza KSeF **[do potwierdzenia z biurem rachunkowym]** | F2 |
| MDR 2017/745, reguła 11 | oprogramowanie dostarczające informacji do decyzji diagnostycznych lub terapeutycznych to wyrób medyczny | Crux nie zawiera takich funkcji (ADR-017, ADR-024); obrazy w Crux tylko jako podgląd bez narzędzi pomiarowych i filtrów diagnostycznych (ADR-028) | stale |
| AI Act 2024/1689 | art. 50: informowanie, że rozmówca to AI (stosowany od 2.08.2026); AI będąca wyrobem medycznym = wysokie ryzyko; terminy dla wysokiego ryzyka przesuwane pakietem „Digital Omnibus” **[do potwierdzenia stanu prawnego przed F6]** | czat dla pacjenta oznaczony jako AI; brak funkcji klinicznych AI bez ADR | F6 |
| [EHDS, rozporządzenie (UE) 2025/327](https://health.ec.europa.eu/ehealth-digital-health-and-care/certification-ehr-systems_en) | producent systemu EHR: dokumentacja techniczna (art. 37), instrukcja użytkowania (art. 38), deklaracja zgodności UE (art. 39), testy w europejskim środowisku testowym (art. 40), oznakowanie CE (art. 41), wpis do bazy UE systemów EHR (art. 49); dwa zharmonizowane komponenty: **interoperacyjności** (import/eksport w europejskim formacie EEHRxF) i **logowania** (logi dostępu); stosowanie od „początku 2029” dla pierwszej grupy kategorii priorytetowych i od „początku 2031” dla drugiej; kategorie priorytetowe: patient summary, e-recepta, e-dyspensacja, obrazowanie i opisy, wyniki badań, karty wypoczynkowe | od F0: pełny log dostępu do danych (komponent logowania), od F6: eksport w EEHRxF, dokumentacja techniczna, samoocena **[do potwierdzenia, czy użycie wewnętrzne = „oddanie do użytku”]** | F0, F6 |
| Krajowy System Cyberbezpieczeństwa (wdrożenie NIS2) | obowiązki dla podmiotów ważnych i kluczowych w sektorze zdrowia **[do potwierdzenia progów i daty wejścia w życie nowelizacji]** | gabinety poniżej progów wielkości; wracamy przy wzroście sieci | monitorowane |

## 3. Mapa wymagań § 1 ust. 6 rozporządzenia na mechanizmy Crux

To jest lista kontrolna audytu przed F4. Każdy punkt ma mechanizm, test i właściciela.

| Pkt | Wymaganie | Mechanizm w Crux | Jak to udowadniamy |
|---|---|---|---|
| 1 | integralność treści i metadanych; zmiany tylko w udokumentowanych procedurach | tabele kliniczne tylko dopisywane; wersje z `correction_reason`; `content_hash` w łańcuchu SHA-256 per pacjent; odebrane `UPDATE`/`DELETE` na poziomie bazy; procedura korekty w `docs/ops/korekta-wpisu.md` | pgTAP: `UPDATE` na `clinical_entry_versions` rzuca `42501`; test weryfikacji łańcucha; audyt zmian |
| 2 | stały dostęp dla uprawnionych, blokada dla nieuprawnionych | RLS + `authorize()`; MFA; role; blokada ekranu; tryb awaryjny PWA tylko do odczytu; SLA 99,5% i PITR | testy izolacji tenantów; test odtworzenia z kopii raz na kwartał |
| 3 | identyfikacja osoby sporządzającej, wpisującej, zmieniającej, z zakresem zmiany | `created_by`, `signed_by` (staff_member z NPWZ), wersje z diffem treści, audyt z wartością przed i po | pgTAP: trigger audytu; e2e: podpis wpisu |
| 4 | czas sporządzenia, wpisu i zmiany | `occurred_at` (czas świadczenia), `recorded_at` (czas wpisu), `signed_at`; zawsze czas serwera | test: wpis z zegarem `ctx.clock` |
| 5 | cechy informacyjne dokumentów (§ 10 pkt 3: dane podmiotu, pacjenta, osoby udzielającej, data) | nagłówek każdego dokumentu generowany z `tenant`, `location`, `patient`, `staff_member`; kod resortowy gabinetu w `locations` | test generatora PDF/CDA |
| 6 | formaty i standardy: art. 11 ustawy o SIOZ, w ich braku HL7 i DICOM | eksport wpisów do HL7 CDA (PIK), zdarzenia medyczne w FHIR (ADR-021), obrazy w DICOM (ADR-028) | walidacja CDA schematronem CeZ w CI (F4) |
| 7 | wydruk | generator PDF w szacie marki dla każdej jednostki dokumentacji | e2e: wydruk karty |
| 8 | eksport całości danych umożliwiający odtworzenie w innym systemie | `pnpm export:patient <id>` i `pnpm export:tenant`: paczka ZIP z CDA/XML, PDF, DICOM, JSON (schemat opublikowany), manifest z sumami kontrolnymi | test: eksport i ponowny import na pustej bazie (round-trip) |

## 4. Podpisy: co, czym i kiedy

```
wpis kliniczny (dokumentacja wewnętrzna)
  → § 4 ust. 4: wewnętrzne mechanizmy systemu
  → „podpis wewnętrzny Crux”: tożsamość (konto imienne + MFA) + czas serwera
    + skrót treści w łańcuchu per pacjent + wpis audytu
  → nie wymaga certyfikatu

dokument EDM (opis RTG, informacja o rozpoznaniu…, e-recepta, e-skierowanie)
  → § 4 ust. 3 + ustawa o SIOZ: podpis kwalifikowany / zaufany / osobisty / sposób ZUS
  → dokument HL7 CDA generowany z wpisów → podpis przez bramkę P1 (certyfikat ZUS lekarza
    albo podpis kwalifikowany) → indeks w P1 → status w karcie wizyty
```

Definicja „podpisu wewnętrznego Crux” (do umieszczenia w procedurach i instrukcji użytkowania):

1. Autor jest zalogowany kontem imiennym z MFA; sesja nie starsza niż 12 h; przy podpisie system wymaga ponownego potwierdzenia (hasło lub klucz FIDO2) **[decyzja F4: czy wymagamy potwierdzenia przy każdym podpisie, czy raz na sesję]**.
2. Treść jest zamrażana: wersja dostaje `signed_at` (czas serwera), `signed_by`, `content_hash = sha256(prev_hash || canonical_json(content))`, gdzie `prev_hash` to skrót poprzedniej wersji dowolnego wpisu tego pacjenta.
3. Zdarzenie `clinical_entry.signed` trafia do audytu i outboxa. Wpis staje się tylko do odczytu na poziomie bazy.
4. Raz na dobę worker weryfikuje łańcuchy skrótów i zapisuje wynik w `audit.integrity_checks`. Niezgodność to incydent bezpieczeństwa.

Czy to spełnia § 4 ust. 4: **[do potwierdzenia przez prawnika]**, ale tak działają systemy gabinetowe z rynku (podpis wewnętrzny loginem), a wymóg „wewnętrzne mechanizmy systemu” jest spełniony z zapasem (łańcuch skrótów, audyt).

## 5. Czy Supabase się kwalifikuje: odpowiedź w wersji 2.0

**Tak, warunkowo.** Ustalenia z 5.11.2026 na podstawie [Data Residency and Transfers FAQ (wersja 1, 6.10.2026)](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq) i [cennika](https://supabase.com/pricing.md):

- W wybranym regionie (Frankfurt, `eu-central-1`) zostają: baza PostgreSQL, Auth, obiekty Storage i kopie zapasowe. Edge Functions można przypiąć do regionu.
- Poza regionem: dane konta i rozliczeń (Supabase jako administrator), dostęp pracowników wsparcia (globalny, logowany, ograniczony, tylko na prośbę klienta lub przy incydencie), telemetria i metadane (nie dane aplikacji; **logi przechowywane w centrach danych w UE**), treści Storage mogą być cachowane przez globalny CDN zależnie od konfiguracji i lokalizacji odbiorcy.
- Podmioty: Supabase Pte. Ltd. (Singapur) jako główny procesor; Supabase, Inc. (USA) do wsparcia i operacji. Transfery na **standardowych klauzulach umownych** w DPA plus zabezpieczenia uzupełniające; opublikowana **ocena skutków transferu (TIA)**. FAQ nie powołuje się na EU-US DPF, więc i my się nie powołujemy.
- Plany: Pro od 25 USD/mies. (kopie 7 dni, logi 7 dni), Team od 599 USD/mies. (SOC 2 i ISO 27001, HIPAA jako płatny dodatek, SSO do panelu, kopie 14 dni, logi 28 dni, logi audytowe platformy, role per projekt, PrivateLink). PITR: 100 USD/mies. za każde 7 dni retencji. Compute: Micro 10, Small 15, Medium 60, Large 110 USD/mies.
- Nie znamy polskiego przepisu, który wymagałby lokalizacji dokumentacji medycznej w Polsce. § 1 ust. 5–7 rozporządzenia wymaga bezpieczeństwa, integralności, dostępności i planu przechowywania, bez wymogu terytorium. **[do potwierdzenia w opinii prawnej]**

**Warunki (ADR-004 w brzmieniu uzupełnionym przez ADR-020):**

1. **Osobna organizacja Supabase dla podmiotu leczniczego** („Zenit Stomatologia”), poza organizacją „Zenit Labs”, w której działa Kurs na LDEK. Osobna umowa, osobne rozliczenia, osobne uprawnienia do panelu, osobny DPA. Projekty: `crux-staging`, `crux-prod`, oba `eu-central-1`.
2. Plan **Pro + PITR (7 dni) + compute Small** od F0 do F3; przejście na **Team** przed F4 (dokumentacja medyczna): raport SOC 2 do DPIA, dłuższa retencja logów, SSO i role do panelu, logi audytowe platformy.
3. Podpisany DPA, zarchiwizowana TIA Supabase, własna DPIA z wpisem o transferach wsparcia.
4. **Data API (PostgREST) wyłączone** (brak eksponowanych schematów); dostęp do bazy wyłącznie z `apps/web` i `apps/worker` przez Drizzle z RLS (ADR-005). Anonimowy klucz nie ma do czego się podłączyć.
5. Żadnych danych pacjenta w logach Postgresa (`log_statement = none`, `log_min_error_statement = panic` lub parametry zapytań wyłączone), komunikatach błędów, telemetrii, Sentry.
6. **Pliki medyczne poza Supabase Storage**: w magazynie obiektowym u dostawcy z UE (ADR-026) za portem `FileStoragePort`; Supabase Storage tylko do plików niemedycznych (szablony, logotypy, awatary). Powód: CDN i mniej zależności od jurysdykcji.
7. PESEL, numery dokumentów i skany dokumentów tożsamości szyfrowane w aplikacji (ADR-025), PESEL dodatkowo jako HMAC do wyszukiwania.
8. **Plan wyjścia**: tylko standardowy PostgreSQL (żadnych funkcji dostępnych wyłącznie w Supabase poza Auth i Storage, które są za `AuthPort` i `FileStoragePort`); nocny `pg_dump` do zaszyfrowanego magazynu w UE poza Supabase; test odtworzenia na czystym Postgresie raz na kwartał; udokumentowana procedura przeniesienia na Postgres u dostawcy z UE (Hetzner, OVHcloud, Scaleway, Aiven) w 2 dni robocze.

**Ryzyko resztkowe:** transfery do USA i Singapuru (wsparcie, konto) na SCC oraz niepewność wokół DPF w TSUE. Akceptuje właściciel na piśmie w DPIA. Jeśli opinia prawna uzna je za nieakceptowalne, uruchamiamy plan wyjścia przed F4.

## 5a. Co zmienia wydanie 1.0 bez danych pacjentów (ADR-032)

Wydanie 1.0 przetwarza wyłącznie dane personelu (imię i nazwisko, e-mail służbowy, NPWZ, rola, godziny pracy foteli, kwoty pomocnicze bez powiązania z pacjentem). To dane osobowe zwykłe (RODO art. 6, podstawa: umowa i prawnie uzasadniony interes administratora jako pracodawcy/zleceniodawcy), bez danych o zdrowiu i bez dokumentacji medycznej. Skutki:

- przed 1.0 wystarczy: wpis w rejestrze czynności (przetwarzanie danych personelu), DPA z Supabase, Vercel i Sentry (standardowe), informacja dla personelu (art. 13), konta imienne z MFA; DPIA i opinia prawna o dokumentacji medycznej nie są warunkiem wdrożenia 1.0 (są warunkiem 1.1);
- rozporządzenie o dokumentacji medycznej (§ 1 ust. 5–7, § 4) nie ma zastosowania do 1.0; procedury z `docs/ops/` powstają już w 1.0 (K16), żeby 1.1 ich nie czekało;
- reguła `doctor` sprawdza, że w migracjach 1.0 nie ma tabel `patients*`, a `chair_occupancy.note` jest walidowana pod kątem danych osobowych (`containsPii`);
- `audit.access_log` w 1.0 nie zapisuje nic (nie ma kart pacjentów do otwarcia), ale mechanizm jest testowany, bo w 1.1 staje się komponentem logowania EHDS.

**[do potwierdzenia]** z prawnikiem przy pytaniach z sekcji 8: czy godziny pracy wykonawców i kwoty per wykonawca wymagają dodatkowej informacji dla personelu (pomiar efektywności pracy, art. 22³ Kodeksu pracy dla pracowników etatowych vs. umowy współpracy).

## 6. Środki bezpieczeństwa (RODO art. 32)

### Dostęp
- Konta imienne, bez kont współdzielonych. MFA (TOTP lub klucz FIDO2) obowiązkowe od pierwszego dnia.
- Role i uprawnienia w `@crux/identity` (zasada najmniejszych uprawnień). Recepcja nie widzi treści wpisów klinicznych; widzi listę wizyt, dane kontaktowe, salda.
- Dostęp awaryjny (break-glass) do karty pacjenta spoza własnego gabinetu wymaga podania powodu i trafia do raportu kierownika.
- Przegląd uprawnień raz na kwartał; automatyczne wyłączenie konta przy końcu umowy (`memberships.ends_at`).
- Do panelu Supabase i Vercel: SSO/MFA, dostęp tylko dla dwóch osób, logi audytowe platformy (Team).

### Ślad
- Audyt zmian: trigger w schemacie `audit`, tylko dopisywanie, wartość przed i po, identyfikator aktora, powód przy korekcie.
- Log dostępu: każde otwarcie karty pacjenta, wydruk, eksport, pobranie pliku, podgląd obrazu. To jest zarazem komponent logowania EHDS.
- Alarmy (worker, codziennie i w czasie rzeczywistym): ponad 50 kart otwartych przez jedną osobę w godzinę, eksport masowy, logowanie spoza Polski, odczyt karty pacjenta bez wizyty w ciągu ±30 dni.
- `pgaudit` włączone dla DDL i ról (bez parametrów zapytań).

### Dane
- Szyfrowanie w spoczynku (AES-256 u dostawców) i w transmisji (TLS 1.2+).
- Szyfrowanie aplikacyjne (ADR-025): PESEL, numery dokumentów, skany dokumentów tożsamości, nagrania i transkrypcje (F6). Klucz główny w KMS u dostawcy z UE, klucze danych rotowane.
- Kopie: PITR + nocny `pg_dump` szyfrowany do magazynu w UE poza Supabase, retencja 35 dni + kopie miesięczne 12 mies. + kopia roczna 20 lat dla dokumentacji (F4).
- Dane testowe tylko syntetyczne (fabryki). Zakaz kopiowania produkcji na laptopy i do środowisk podglądu.

### Stanowiska w gabinecie
- Blokada ekranu po 5 min, szyfrowanie dysków, aktualizacje, osobna sieć Wi-Fi dla pacjentów, tablety w trybie kiosku.
- Stanowiska z Romexis i lokalnym agentem: konto usługi agenta bez uprawnień administratora, token urządzenia odwoływalny z Crux.

### Wytwarzanie
- Zależności skanowane w CI (`pnpm audit`, Dependabot), sekrety tylko w menedżerze sekretów, nigdy w repo (`gitleaks` w CI).
- Test penetracyjny przed F4 i raz w roku; przegląd kodu przez człowieka dla etykiet `security`, `clinical`, `money`, `destructive-migration`.
- Rejestr promptów i przegląd adwersarialny (`10-praca-z-ai.md`): każda zmiana w uprawnieniach, RLS, audycie i eksporcie przechodzi przegląd drugiego modelu i człowieka.

## 7. Zgody i formy

| Sytuacja | Forma w Crux | Uwagi |
|---|---|---|
| Zgoda na zabieg o podwyższonym ryzyku | formularz z wersją szablonu, podpis odręczny na tablecie, PDF z sumą kontrolną w łańcuchu pacjenta | czy podpis na tablecie spełnia wymóg formy pisemnej **[do potwierdzenia]**; alternatywa: wydruk, podpis, skan |
| Akceptacja planu leczenia i kosztorysu | jak wyżej | dowód ceny przedstawionej pacjentowi; ceny zamrożone (ADR-008) |
| Zgoda marketingowa (SMS, e-mail) | pole wyboru z treścią i datą, osobno dla kanałów | odwołanie jednym kliknięciem z linku lub SMS STOP |
| Upoważnienie do informacji i dokumentacji | formularz w karcie pacjenta, wersjonowany | może być odwołane w każdej chwili |
| Pacjent małoletni | podpis opiekuna; od 16 lat także pacjenta (zgoda łączna) | sprawdzane regułą domenową |
| Przetwarzanie przez AI (F6) | informacja i zgoda na nagrywanie wizyty | osobna zgoda, osobny rejestr |

## 8. Otwarte pytania do prawnika (przed F1, z wyjątkiem oznaczonych F4/F6)

1. Która spółka jest twórcą i operatorem systemu i jakie umowy łączą ją z podmiotem leczniczym (licencja, powierzenie, odpowiedzialność, własność kodu)?
2. Czy użycie Crux przez podmiot powiązany to „oddanie do użytku” w rozumieniu EHDS i od kiedy dotyczą nas obowiązki producenta? (F6)
3. Akceptowalność transferów do USA i Singapuru przy Supabase i Vercel na SCC i TIA, w świetle aktualnego orzecznictwa.
4. Czy „podpis wewnętrzny Crux” (sekcja 4) spełnia § 4 ust. 4 rozporządzenia dla dokumentacji wewnętrznej? Czy wymagane jest ponowne uwierzytelnienie przy każdym podpisie? (F4)
5. Forma zgody na zabieg i akceptacji planu: podpis na tablecie czy podpis kwalifikowany/zaufany/osobisty?
6. Czy przy czterech gabinetach przetwarzanie ma „dużą skalę” (IOD, DPIA)?
7. Czy recall (zaproszenie na przegląd) wymaga zgody marketingowej, czy mieści się w realizacji usługi?
8. Jeśli gabinety 03 i 04 będą osobnymi spółkami: zasady udostępniania dokumentacji przy przejściu pacjenta między podmiotami i czy wspólny terminarz sieci jest dopuszczalny bez udostępniania danych medycznych.
9. Faktury dla pacjentów na żądanie: poza KSeF czy w KSeF; wymogi dla usług zwolnionych z VAT. (F2, z biurem rachunkowym)
10. Nagrywanie wizyty do transkrypcji AI: podstawa, zgoda, retencja nagrań. (F6)

Pytanie z wersji 1.0 „czy opis RTG jest EDM” ma odpowiedź w sekcji 2 (tak, § 1 pkt 5 rozporządzenia o rodzajach EDM) i zostało usunięte z listy.
