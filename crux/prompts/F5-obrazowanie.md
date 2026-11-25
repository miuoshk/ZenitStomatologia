# F5 · Obrazowanie i skanery: prompty K01–K07

Wymaga ukończonego F4 oraz: spisu sprzętu, licencji DICOM w Romexis (Storage, docelowo Full), mini-PC/NAS z Dockerem w gabinecie, decyzji o tunelu. Projekt: `docs/12-obrazowanie-dicom.md`. Etykieta `clinical` dla przeglądarki podglądu (granica MDR).

---

### K01 · Agent `apps/bridge` i urządzenia (F5-001)  [security]

**Przeczytaj.** `@docs/12` (sekcje 2, 6), `@docs/03a` (sekcja 14: `devices`), `@docs/02` (ADR-028).

**Kroki.** `apps/bridge`: Node 22, pakowany jako pojedynczy plik (SEA lub `pkg`) i instalowany jako usługa Windows (`node-windows`), konfiguracja w `%ProgramData%\Crux\bridge.json` (adres Crux, token urządzenia, możliwości), połączenie wychodzące WebSocket (`wss://`) z uwierzytelnieniem tokenem (`devices.token_hash`, rotacja z Crux), kolejka komend (`bridge_commands`: `open_in_romexis`, `print_receipt`, `rescan_folder`, `ping`) z potwierdzeniem i wynikiem, heartbeat 30 s (`devices.last_seen_at`), logi lokalne bez danych pacjenta (identyfikatory), automatyczna aktualizacja z podpisanym pakietem (sprawdzenie podpisu przed instalacją). W Crux: `/ustawienia/urzadzenia` (rejestracja urządzenia kodem jednorazowym, stan, możliwości, odwołanie tokenu). Testy: protokół komend (jednostkowe), e2e z atrapą agenta w CI (`fakeBridge`).

**Ograniczenia.** Agent nigdy nie nasłuchuje na porcie publicznym; komponent .NET tylko po decyzji (TWAIN/VDDS).

---

### K02 · Otwórz w Romexis (F5-002)  [security]

**Kroki.** Komenda `open_in_romexis` → agent wywołuje `DxStart.exe "<patient_number>" "<nazwisko>" "<imię>" "<YYYYMMDD>" "<lekarz>"` (transliteracja diakrytyków w wersji CLI; PmBridge DLL, jeśli potwierdzona w F0; ścieżka z konfiguracji), wynik do Crux; przycisk „Otwórz w Romexis” w karcie pacjenta i w wizycie klinicznej (widoczny, gdy urządzenie z możliwością `romexis` jest online w gabinecie użytkownika); log dostępu `imaging_open`. Test ręczny w gabinecie 01 z listą kontrolną w `docs/ops/romexis-wdrozenie.md`; pomiar < 3 s.

---

### K03 · Orthanc, DICOMweb, podgląd (F5-003)  [clinical]

**Przeczytaj.** `@docs/12` (sekcje 2–3, 6), `@docs/03a` (sekcja 14), `@docs/02` (ADR-017, 028).

**Część 1/3 · infrastruktura.** `infra/orthanc/`: `docker-compose.yml` (Orthanc + PostgreSQL indeks + wtyczki DICOMweb, Worklists, Python), `orthanc.json` (AET `CRUX<nr>`, lista dozwolonych modalności z Romexis, HTTP z uwierzytelnieniem, TLS przez reverse proxy, `OnStableStudy` → webhook do agenta), skrypt instalacji na mini-PC, konfiguracja tunelu (decyzja z F0/F5), dokument `docs/ops/orthanc-gabinet.md`. Test na stagingu z publicznymi próbkami DICOM.

**Część 2/3 · indeks.** `pnpm gen module imaging`. Migracja `imaging_studies`, `scan_files`. Worker/agent: webhook `study.stable` → agent pobiera metadane (QIDO) i miniaturę (WADO `rendered`, rozmiar 512 px) → wysyła do Crux `imaging.study.received.v1` → `createImagingStudy` (dopasowanie pacjenta po `PatientID` = `patient_number`; brak → kolejka „badania bez pacjenta”), miniatura do magazynu UE (`files`, `kind = imaging_thumbnail`). Przypadki użycia: `assignStudyToPatient`, `tagStudyTeeth`, `listPatientStudies` (log dostępu `imaging_study`), `getStudyViewerToken` (krótkotrwały token do DICOMweb przez tunel, po `authorize`). pgTAP `tenant_location`.

**Część 3/3 · podgląd.** Zakładka „Obrazowanie” w karcie pacjenta: siatka miniatur chronologicznie z chipem gabinetu i modalnością; przeglądarka podglądu (OHIF w trybie podstawowym lub Stone Web Viewer) osadzona z konfiguracją **bez** narzędzi pomiarowych, okienkowania diagnostycznego, filtrów, adnotacji; stała etykieta „Podgląd, nie do diagnostyki. Diagnoza w Romexis.”; przycisk „Otwórz w Romexis”. Reguła `doctor`: `imaging.viewer-config` sprawdza, że konfiguracja przeglądarki nie włącza narzędzi z listy zabronionej. Testy wizualne; e2e z atrapą DICOMweb.

---

### K04 · Modality Worklist (F5-004)

**Kroki.** Worker `imaging.worklist` co 5 min: dla gabinetów z Orthanc i pakietem Worklist w Romexis generuje pliki `.wl` (DICOM MWL) z wizyt dnia (`PatientID` = `patient_number`, nazwisko, imię, data urodzenia, płeć, `ScheduledProcedureStep` z czasem wizyty i AET) przez agenta do katalogu Orthanca (wtyczka Worklists) lub przez API Orthanca; usuwa wpisy po zakończeniu wizyty. Test: generator MWL na zestawie wzorcowym waliduje się narzędziem `dcmdump`/pydicom w CI. Pomiar: odsetek badań bez pacjenta po wdrożeniu (cel < 2%).

---

### K05 · Skany STL i podgląd 3D (F5-005)

**Kroki.** Agent: obserwowany folder (`C:\CruxScans\<patient_number>\` lub bez numeru → „plik bez pacjenta”), wysyłka do magazynu UE przez Crux (`scan_files`), deduplikacja po hashu; w Crux: lista skanów w karcie, `ScanViewer` (three.js: STL/PLY/OBJ, obrót, zoom, brak pomiarów), przypięcie do pacjenta z kolejki. 3Shape Unite/Medit: po potwierdzeniu dostępu do interfejsów (CLI/Web Service) adapter `scanner-3shape` do otwarcia pacjenta i odbioru przypadków; inaczej folder zostaje. Test: plik testowy STL z fabryki renderuje się w Storybooku.

---

### K06 · Opis badania jako EDM (F5-006)  [clinical]

**Kroki.** Wpis `imaging_report` powiązany z `imaging_study_id` (szablon: rodzaj, okolica/zęby, opis, wnioski, zalecenia), podpis wewnętrzny → CDA „opis badania diagnostycznego” → bramka P1 → `edm_documents`; lista „badania do opisania” (> 7 dni bez opisu) na pulpicie lekarza; metryka `documentation_lag_hours` obejmuje opisy. Test: CDA opisu waliduje się schematronem.

---

### K07 · Kopie i retencja obrazów (F5-007)

**Kroki.** Worker/agent `imaging.backup` nocą: nowe instancje z Orthanca (lista po `LastUpdate`) → magazyn UE (prefiks `dicom/<tenant>/<study_uid>/`), deduplikacja po SOPInstanceUID, weryfikacja sum; `imaging_studies.backup_status`; raport miesięczny; retencja jak dokumentacja (20 lat) z `retention_until` na badaniu; procedura odtworzenia Orthanca z kopii (`docs/ops/orthanc-odtwarzanie.md`) przetestowana na stagingu.

---

### Po F5: bramka

Kryteria z `docs/12`, sekcja 8. Wpis w ledger. Następnie F6 (prompty generowane z backlogu `docs/13` w czacie projektu).
