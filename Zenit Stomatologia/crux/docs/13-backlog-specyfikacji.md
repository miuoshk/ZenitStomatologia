# 13 · Backlog specyfikacji

Wersja 1.1 · 6 listopada 2026. Wydanie, w którym specyfikacja trafia do gabinetów: `07`, sekcja 2 (F0 → 1.0 poza F0-001; F1 i F0-001 → 1.1; F2 → 2.0; F3 → 2.1; F4 → 3.0; F5 → 4.0; F6 → 5.0). Lista funkcji do napisania jako specyfikacje (`docs/specs/<ID>.md` z szablonu `_szablon.md`) i zarazem tablica postępu. ID jest stałe i pojawia się w nazwach testów (`[F1-002/AC3]`), gałęziach (`feat/F1-002-terminarz-sieci`) i rejestrze promptów. Statusy: `szkic` → `gotowa do planu` → `w realizacji` → `wdrożona`. Specyfikacje napisane w całości w tej wersji dokumentacji są oznaczone ✦.

## F0 · Fundament

| ID | Nazwa | Moduły | Zakres w jednym zdaniu | Status |
|---|---|---|---|---|
| F0-001 ✦ | Zlecenia do pracowni protetycznej | lab, patients, scheduling, org, platform | lista zleceń z terminem, kosztem, statusem i alertem; **wydanie 1.1** (wymaga pacjentów) | gotowa do planu |
| F0-002 | Audyt i log dostępu | platform | trigger audytu, tabela dostępu, alarmy nietypowych odczytów, ekran przeglądu dla kierownika | szkic |
| F0-003 | Outbox i worker | platform | tabela outbox, dispatcher pg-boss, ponowienia, stany `dead`, ekran „Integracje” | szkic |
| F0-004 | Personel, role, członkostwa | identity | konta imienne, role, uprawnienia jako dane, okresy członkostwa, wygaszanie | szkic |
| F0-005 | Tenanci, gabinety, fotele, godziny | org | konfiguracja sieci, numer gabinetu, kod resortowy, wyposażenie foteli, wyjątki godzin | szkic |
| F0-006 | Logowanie, MFA, blokada ekranu | identity | Supabase Auth, TOTP/FIDO2, sesja 12 h, blokada po 5 min, odblokowanie | szkic |
| F0-007 | Powłoka aplikacji i wyszukiwarka | ui | pasek boczny ze znakiem Crux, chip gabinetu, `Ctrl+K`, nawigacja, stany puste z rycinami | szkic |
| F0-008 | Szyfrowanie aplikacyjne i KMS | shared, platform | `enc:v1`, HMAC, klucze per tenant, rotacja (ADR-025) | szkic |
| F0-009 | Pakiet marki w repo i model kuleczkowy | ui | `packages/ui/brand/` z `Materialy marki/` (tokeny, fonty, logo, ryciny, geometria), `pnpm brand:sync`, `CruxLogo`, komplet wykresów, `Num`, strażnicy `ui.brand-sync`/`ui.brand-separation` | szkic (realizowana w K08) |
| F0-010 ✦ | Obłożenie godzinowe foteli (moduł wzorcowy) | scheduling, org, identity, platform, ui | siatka godzin × fotele per gabinet, wpis: wykonawca, kategoria Z, kwota; blokady foteli; zamknięcie dnia; bez danych pacjenta; wzorzec dla wszystkich modułów | gotowa do planu |
| F0-011 ✦ | Analityka i pulpity wydania 1.0 | analytics, ui, platform | schemat `analytics` (fakty obłożenia i pojemności), zasilanie co 5 min, rejestr metryk, 7 metryk, pulpity sieci/gabinetu/moje, lista drążenia, CSV | gotowa do planu |
| F0-012 | Ekrany administracji | org, identity, platform, ui | organizacja (gabinety, fotele, godziny, wyjątki), personel (konta, role, członkostwa, zaproszenia), ustawienia systemu, Integracje (szkielet) | szkic (realizowana w K15) |

## F1 · Pacjenci i terminarz

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F1-001 ✦ | Kartoteka pacjenta | patients | zakładanie z wykrywaniem duplikatów, numer karty, PESEL szyfrowany, opiekunowie, upoważnienia, scalanie, log dostępu | gotowa do planu |
| F1-002 ✦ | Terminarz sieci | scheduling, org, identity | grafiki, blokady, siatka dnia i tygodnia z fotelami wielu gabinetów, umawianie, przesuwanie, statusy, przeniesienie między gabinetami, najbliższy wolny termin w sieci | gotowa do planu |
| F1-003 ✦ | Przypomnienia i potwierdzenia SMS | messaging, scheduling | szablony, 48 h/2 h, odpowiedź TAK/NIE/STOP, statusy doręczeń, okno 8–20 | gotowa do planu |
| F1-004 | Lista oczekujących | scheduling | wpis z preferencjami, dopasowanie do luk, propozycja terminu, zamknięcie | szkic |
| F1-005 | Ekran Dziś | scheduling, lab, billing (podgląd) | lista dnia, przyjęcie, statusy przy fotelu, prawa kolumna z zadaniami | szkic |
| F1-006 | Import z obecnego programu | integrations | skrypt importu, raport, duplikaty, idempotencja | szkic |
| F1-007 | Rezerwacja online | scheduling, messaging | publiczny formularz Z1/Z2, kod SMS, pacjent do weryfikacji | szkic |
| F1-008 | Synchronizacja ZnanyLekarz | integrations, scheduling | dostępność, rezerwacje, anulowania, mapowanie usług | szkic |
| F1-009 | PWA tylko do odczytu | ui | pamięć podręczna listy dnia, tryb awaryjny | szkic |
| F1-010 | Ekran Integracje | integrations | stan integracji, błędy, kolejka `dead`, ponów | szkic |
| F1-011 | Kompetencje wykonawców i wyposażenie foteli | identity, org, scheduling | reguły dopasowania usługi do wykonawcy i fotela | szkic |

## F2 · Katalog, plany leczenia, finanse

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F2-001 | Katalog usług i cennik wersjonowany | catalog | usługi, kategorie, czasy, wymagania, cennik z datami, wyjątki per gabinet, `priceFor` | szkic |
| F2-002 ✦ | Plan leczenia z wariantami i kosztorysem | planning, catalog | warianty, etapy, pozycje, ceny zamrożone, PDF w szacie marki, statusy | gotowa do planu |
| F2-003 | Akceptacja planu na tablecie | planning | podpis, PDF z sumą, łańcuch, wersja prezentowana | szkic |
| F2-004 | Rozliczenie wizyty, płatności, saldo | billing | należności z usług wizyty, płatności, alokacje, storna, numer paragonu, zaliczki | szkic |
| F2-005 | Rozliczenia wykonawców | billing | umowy, podstawy, stawki, potrącenia lab/materiały, zestawienie miesięczne, zatwierdzenie, korekta | szkic |
| F2-006 | Eksport do Optimy i faktury | integrations, billing | format uzgodniony, uzgodnienie dzienne, `invoice_requests` | szkic |
| F2-007 | Laboratorium w planach i wizytach | lab, planning, scheduling | zlecenie z pozycji planu, wizyta oddania, koszt do rozliczeń | szkic |
| F2-008 | Magazyn plików UE | integrations, platform | `FileStoragePort`, bucket, podpisane URL, `files`, log pobrań | szkic |

## F3 · CRM i dashboardy

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F3-001 ✦ | Pulpit sieci | analytics, ui | filtry, kafle, wykres przychodu, łuki obłożenia per gabinet, wykres kropkowy porównania gabinetów, lejek, siatka recall, rankingi, drążenie | gotowa do planu |
| F3-002 | Schemat `analytics` i zasilanie | analytics | wymiary, fakty, odświeżanie przyrostowe i nocne, `refresh_log` | szkic |
| F3-003 | Rejestr metryk jako kod | analytics | `metrics/*.ts`, zestaw wzorcowy, `pnpm doctor` sprawdza wpisy | szkic |
| F3-004 | Pulpit gabinetu i pulpit lekarza | analytics, ui | widoki per rola, mediana sieci, listy do działania | szkic |
| F3-005 | Przegląd 60 sekund i Koniec dnia | analytics, messaging | strona odprawy, raport e-mail/Teams 21:00 | szkic |
| F3-006 | Recall: reguły, zadania, lista do dzwonienia | crm, scheduling, messaging | reguły per usługa, zadania, kontakty, zamknięcie, najbliższy termin w sieci | szkic |
| F3-007 | Zgody marketingowe i kampanie | crm, messaging | rejestr zgód, STOP, kampanie z odbiorcami | szkic |
| F3-008 | Cele i alerty | analytics, platform | cele per gabinet, reguły alertów, prezentacja | szkic |
| F3-009 | SSO Microsoft Entra ID | identity | OIDC, mapowanie kont | szkic |
| F3-010 | Drukarka fiskalna (agent v0) | integrations | komenda `print_receipt`, numer paragonu | szkic |

## F4 · Dokumentacja medyczna i P1

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F4-001 ✦ | Wizyta kliniczna i wpis z podpisem wewnętrznym | clinical | encounter, wpisy, wersje, łańcuch skrótów, korekta, podpis | gotowa do planu |
| F4-002 | Rozpoznania i procedury | clinical, catalog | ICD-10, ICD-9 PL, ząb, powierzchnie, powiązanie z planem | szkic |
| F4-003 | Odontogram | clinical, ui | projekcja, widok, historia, wejście do wpisu | szkic |
| F4-004 | Szablony wpisów i zgód, podpis na tablecie | clinical | szablony per usługa, zgody wersjonowane, PDF z sumą | szkic |
| F4-005 | Załączniki, eksport dokumentacji, udostępnienia | clinical, interop | pliki, eksport pacjenta (PDF/CDA/JSON), rejestr udostępnień | szkic |
| F4-006 | Interoperacyjność FHIR/CDA | interop | mapery, generatory, walidacja w CI | szkic |
| F4-007 | P1 przez bramkę | integrations, interop | zdarzenia medyczne, EDM, e-recepta, e-skierowanie, statusy, odrzucenia | szkic |
| F4-008 | Należności z procedur | billing, clinical | automatyczne `charges` z procedur, koniec ręcznego rozliczenia | szkic |
| F4-009 | Import archiwum dokumentacji | integrations, clinical | dokumenty archiwalne, wpis stanu wyjściowego | szkic |
| F4-010 | Integralność, retencja, procedury | platform, clinical | weryfikacja łańcuchów, `retention_until`, protokół zniszczenia | szkic |

## F5 · Obrazowanie i skanery

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F5-001 | Agent `apps/bridge` i urządzenia | integrations | usługa Windows, token, komendy, aktualizacje | szkic |
| F5-002 | Otwórz w Romexis | imaging, integrations | `DxStart`, PmBridge, log dostępu | szkic |
| F5-003 | Orthanc, DICOMweb, podgląd | imaging | indeks badań, miniatury, przeglądarka podglądu bez narzędzi diagnostycznych | szkic |
| F5-004 | Modality Worklist | imaging, scheduling | lista dnia do Orthanca | szkic |
| F5-005 | Skany STL i podgląd 3D | imaging | obserwowany folder, przypięcie, three.js | szkic |
| F5-006 | Opis badania jako EDM | clinical, interop | wpis `imaging_report`, CDA, P1 | szkic |
| F5-007 | Kopie i retencja obrazów | imaging, platform | kopia nocna, deduplikacja, retencja | szkic |

## F6 · Skala, EHDS, AI, portal

| ID | Nazwa | Moduły | Zakres | Status |
|---|---|---|---|---|
| F6-001 | Kreator nowego gabinetu | org, identity, catalog | konfiguracja w 2 tygodnie | szkic |
| F6-002 | Eksport EEHRxF i dokumentacja EHDS | interop, platform | format europejski, dokumentacja techniczna, instrukcja | szkic |
| F6-003 | AI: szkic wpisu z transkrypcji | ai, clinical | nagranie, transkrypcja, szkic, akceptacja | szkic |
| F6-004 | AI: streszczenie historii i asystent SMS | ai, messaging | szkice do akceptacji | szkic |
| F6-005 | Portal pacjenta | patients, planning, billing, scheduling | konto pacjenta, plany, płatności, umawianie, dokumenty | szkic |
| F6-006 | Pulpit grupy | analytics | agregaty wielu podmiotów | szkic |
| F6-007 | Klucze API dla integratorów | integrations | dostęp per zasób (wzorzec Open Dental) | szkic |
