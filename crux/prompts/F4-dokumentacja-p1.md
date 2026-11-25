# F4 · Dokumentacja medyczna i P1: prompty K01–K10

Wymaga ukończonego F3 i: opinii prawnej (podpis wewnętrzny, forma zgód), przejścia na Supabase Team, umowy z bramką P1 i dostępu do jej środowiska testowego, słowników `ref` (ICD-10, ICD-9 PL). Etykieta `clinical` = przegląd adwersarialny + człowiek + test pgTAP append-only. Podstawa prawna: `docs/04`, sekcje 2–4.

---

### K00 · Słowniki referencyjne

**Kroki.** `supabase/seed/ref/`: importer ICD-10 PL i ICD-9 PL (źródło: CeZ/NFZ; pliki w repo tylko jeśli licencja pozwala, inaczej skrypt pobierający przy wdrożeniu), `ref.tooth_fdi`, `ref.surfaces`, `ref.vita_shades`, `ref.resort_codes` (z RPWDL, ręcznie), wersjonowanie słowników (`ref.dictionary_versions`). Test: każdy kod ICD-9 używany w `services.default_icd9` istnieje w `ref`.

---

### K01 · `@crux/clinical`: wizyta kliniczna i wpis z podpisem wewnętrznym (F4-001)  [clinical, security]

**Przeczytaj.** `@docs/specs/F4-001-wpis-kliniczny.md`, `@docs/03a` (sekcja 13), `@docs/03` (Encounter, ClinicalEntry), `@docs/04` (sekcje 3–4), `@docs/02` (ADR-008, 021), `@.cursor/rules/50-clinical.mdc`.

**Część 1/4 · dane.** `pnpm gen module clinical`. Migracja: `entry_type`, `encounters`, `clinical_entries`, `entry_versions` (append-only, `revoke update, delete`), `attachments`, `disclosures`, `edm_documents`, `medical_event_reports`, trigger `clinical.set_hash()` liczący `content_hash = sha256(prev_hash || canonical_json(content))` z `prev_hash` = ostatni `content_hash` pacjenta (blokada `advisory lock` per pacjent w transakcji), trigger blokujący `insert` do `entry_versions` bez `signed_by` gdy `version > 1` (korekta musi być podpisana), `retention_until` na `encounters` (koniec roku ostatniego wpisu + 20 lat, aktualizowany triggerem). RLS: `tenant_all` dla select z dodatkowym warunkiem roli (recepcja nie ma `clinical_entry.read`: polityka `using (auth.has_permission('clinical_entry.read'))`), insert `clinical_entry.write` (`dentist`, `hygienist`), podpis `clinical_entry.sign` tylko wykonawca z NPWZ. pgTAP: brak update/delete, łańcuch hash, recepcja nie czyta `entry_versions`.

**Część 2/4 · domena.** `Encounter.open` (z `appointment` lub ręcznie), `close` (≥ 1 wpis podpisany; wykonawca z NPWZ), `ClinicalEntry` z treścią strukturalną per typ (schematy Zod: `history` – wywiad z polami alergie/leki/choroby jako lista kodowana + tekst; `examination` – stan zębów jako lista `{tooth, surfaces, finding}`; `diagnosis` – ICD-10; `procedure_note` – procedury; `recommendation`; `imaging_report` – opis badania; `referral`; `prescription` – do bramki), `sign(version, actor, clock)` (wymaga ponownego uwierzytelnienia wg decyzji prawnika; flaga), `correct(entry, newContent, reason)` → nowa wersja; `canonicalJson` deterministyczny (klucze posortowane, bez białych znaków). Testy jednostkowe: łańcuch, korekta, odmowa podpisu bez NPWZ.

**Część 3/4 · aplikacja.** `openEncounter`, `addEntry` (draft, `version = 1`, bez podpisu), `signEntry` (zapis `signed_*`, `content_hash`, audyt `sign`, zdarzenie `clinical_entry.signed.v1`), `correctEntry` (nowa wersja + podpis + `correction_reason`), `closeEncounter` (zdarzenie `encounter.closed.v1` → K07), `addAttachment` (plik przez `FileStoragePort`, hash w `files`), `recordDisclosure`, `exportPatientRecord(patientId, format: pdf|cda|json)` (zapis w logu dostępu + `disclosures`), zapytania `getEncounter`, `listPatientHistory` (chronologia z wersjami; każde wywołanie loguje dostęp `clinical_entry`). Testy AC1–AC10.

**Część 4/4 · UI.** Ekran wizyty klinicznej (`/wizyta/[encounterId]`, iPad przy fotelu): lewa kolumna historia pacjenta (zwijana), środek: wpisy z szablonów per usługa (K04), prawa: odontogram (K03) i plan; podpis z `ConfirmDialog` (wymaga hasła/klucza, jeśli flaga), wersje widoczne („wersja 2, korekta: literówka w zębie”), wydruk PDF wpisu i całej wizyty. Karta pacjenta → zakładka Dokumentacja. e2e: wpis → podpis → korekta → eksport PDF; recepcja nie widzi zakładki.

**Ograniczenia.** Treść wpisu nigdy w URL/logach; podgląd wpisu loguje dostęp. Nie dodawaj „sugestii rozpoznania”.

---

### K02 · Rozpoznania i procedury (F4-002)  [clinical, money]

**Kroki.** Migracja `diagnoses`, `procedures` (powiązane z `entry_version_id`); `addDiagnosis`/`addProcedure` jako część treści wpisu (zapis tabelaryczny przy podpisie: trigger lub aplikacja rozpakowuje `content` do tabel — wybierz aplikację, bo potrzebna walidacja kodów); procedura z `plan_item_id` oznacza pozycję `done`; zdarzenie `procedure.recorded.v1` → `billing` tworzy `charge` automatycznie (K08). UI: wybór ICD-10/ICD-9 z wyszukiwarką słownika, ząb/powierzchnie z `ToothPicker`, domyślny ICD-9 z usługi. Testy: procedura bez kodu ze słownika odrzucona; `charge` powstaje raz (idempotencja po `procedure_id`).

---

### K03 · Odontogram jako projekcja (F4-003)  [clinical, ui]

**Kroki.** `odontogramAt(patientId, date)` w `clinical/domain/odontogram.ts`: redukcja chronologiczna rozpoznań i procedur na stan 32 + 20 zębów (reguły pierwszeństwa: `missing`/`implant` > `crown` > `root_canal` > `filling` > `caries` > `sound`; powierzchnie dla wypełnień/próchnicy; `extraction_planned` z planu), testy na scenariuszach (ząb po leczeniu kanałowym i koronie; mleczny → stały). `Odontogram` w `packages/ui` (SVG, FDI, stany kolorem + wzorem + etykietą dostępną, tryb odczytu i wejścia: kliknięcie zęba otwiera dodanie rozpoznania/procedury do bieżącego wpisu), suwak daty „stan na dzień”. Storybook i testy wizualne.

---

### K04 · Szablony wpisów i zgód, podpis na tablecie (F4-004)  [clinical]

**Kroki.** `entry_templates` (per usługa/typ, pola strukturalne + tekst z podstawieniami), `consent_templates` (wersjonowane; treść zgodna z opinią prawnika), `consents` (append-only; PDF z sumą w łańcuchu pacjenta; podpis pacjenta/opiekuna na `SignaturePad`; `revoked_at`), reguła: zabieg z usługą oznaczoną `requires_consent` nie może być podpisany we wpisie bez aktywnej zgody (ostrzeżenie + blokada podpisu). UI: wybór szablonu przy nowym wpisie; tryb kiosku zgody na iPadzie (jak akceptacja planu). Testy AC.

---

### K05 · Załączniki, eksport dokumentacji, rejestr udostępnień (F4-005)  [security]

**Kroki.** Zakładka załączniki (zdjęcia z iPada, skany; `files` z `kind`), `exportPatientRecord` → paczka ZIP: PDF całości, CDA per wpis (K06), JSON z opublikowanym schematem (`docs/export-schema.json`), manifest z sumami; `disclosures` z formularzem (komu, podstawa, zakres, forma) i generatorem pisma przewodniego; test round-trip: eksport → import na pustej bazie (`pnpm import:patient`) → te same skróty. `pnpm export:tenant` dla całości (§ 1 ust. 6 pkt 8).

---

### K06 · `@crux/interop`: FHIR R4 i HL7 CDA (F4-006)  [clinical]

**Przeczytaj.** `@docs/02` (ADR-021), `@docs/03` (sekcja 6), `@docs/05` (sekcja 2), dokumentacja CeZ (profile ZM, PIK HL7 CDA) i dokumentacja bramki.

**Kroki.** `pnpm gen module interop`. Mapery `toFhir.*` (Patient, Practitioner, PractitionerRole, Organization, Location, Encounter, Condition, Procedure, Consent, DocumentReference, ImagingStudy) i `fromFhir.*` (import), generator Bundle zdarzenia medycznego wg profilu CeZ, generator CDA dla typów EDM gabinetu (informacja o rozpoznaniu/świadczeniach/zaleceniach, opis badania diagnostycznego) z szablonów XML, walidacja: schemat XSD CDA + schematron CeZ (pliki w repo, jeśli licencja pozwala) w CI na przykładach z fabryk; test: każde pole kliniczne z `03a` ma mapowanie lub adnotację `local` (lista w `interop/src/coverage.ts`, `doctor` reguła `interop.coverage`).

**Zatrzymaj się, gdy.** Profil CeZ wymaga pola, którego model nie ma (PR do `03a` + ADR, jeśli to zmiana zasady).

---

### K07 · P1 przez bramkę (F4-007)  [clinical, security]

**Kroki.** Port `P1Gateway` (z `docs/05`, 2.3), adapter `p1-medfile` (JWT z integrator UUID + sekret; środowisko testowe; dokumenty XML; obsługa odpowiedzi i kodów błędów P1), atrapa `fakeP1`. Worker: `encounter.closed.v1` → Bundle → `reportMedicalEvent` → `medical_event_reports` status; `clinical_entry.signed.v1` typu EDM → CDA → podpis (wg umowy: certyfikat ZUS lekarza w bramce lub podpis po naszej stronie) → `indexDocument` → `edm_documents`; e-recepta/e-skierowanie z wpisu `prescription`/`referral` (UI z bazą leków bramki); odrzucenia → lista kierownika (`/integracje/p1`) z powodem i „popraw i wyślij ponownie” (korekta = nowa wersja + nowe zgłoszenie). Testy kontraktowe na nagraniach ze środowiska testowego (bez danych osobowych). Metryka `p1_rejections` w rejestrze. Plan C: ekran „do zgłoszenia ręcznie” z polem identyfikatora zdarzenia.

---

### K08 · Należności z procedur automatycznie (F4-008)  [money]

**Kroki.** Konsument `procedure.recorded.v1` w `billing`: `charge` z ceną z planu lub `priceFor` na `performed_at`, idempotentnie po `procedure_id`; panel „Rozliczenie wizyty” pokazuje pozycje z procedur (recepcja nie wybiera już usług ręcznie, może dodać rabat z powodem); korekta procedury (nowa wersja wpisu) → storno należności + nowa należność. Test: zgodność sumy należności z procedurami wizyty na zestawie wzorcowym.

---

### K09 · Import archiwum dokumentacji (F4-009)  [clinical]

**Kroki.** Rozszerzenie importera z F1-K08: dokumentacja historyczna jako `attachments` (PDF/XML per wizyta) + jeden wpis `examination` „stan wyjściowy z importu” podpisany przez lekarza prowadzącego po weryfikacji; `legacy_refs`; raport; brak nadpisywania istniejących wpisów. Archiwum starego programu zostaje w magazynie w UE z `retention_until` 20 lat.

---

### K10 · Integralność, retencja, procedury (F4-010)  [security]

**Kroki.** Worker `integrity.verify` 03:00: weryfikacja łańcuchów per pacjent (próbka 10% dziennie, pełna co tydzień) → `audit.integrity_checks`; niezgodność → incydent (procedura `docs/ops/incydent-bezpieczenstwa.md`) + alert dla zarządu; `retention.sweep` miesięcznie: lista rekordów po `retention_until` do protokołu zniszczenia (bez automatycznego usuwania; usuwanie przez `withWorker('retention.destroy')` po zatwierdzeniu przez zarząd z protokołem w `audit.events`); raport dla audytu `docs/ops/raport-integralnosci.md` generowany miesięcznie. Test penetracyjny (zewnętrzny) i aktualizacja DPIA przed wdrożeniem.

---

### Po F4: bramka

Dwa tygodnie 01 w Crux z P1 (odrzucenia ≤ 2%), potem 02; round-trip eksportu; archiwum starego programu zabezpieczone; wyłączenie starego programu z protokołem. Wpis w ledger.
