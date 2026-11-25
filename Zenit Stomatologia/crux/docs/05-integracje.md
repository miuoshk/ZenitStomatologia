# 05 · Integracje

Wersja 2.0 · 5 listopada 2026. Wszystkie integracje mają ten sam kształt: **port** (interfejs TS w `@crux/integrations/ports`), **adapter** (implementacja dla dostawcy), **atrapa** (`testing/fake-*.ts` do testów i środowiska lokalnego), **outbox** (wysyłka asynchroniczna z ponowieniami), **log integracji** (każde wywołanie: status, czas, identyfikatory, bez danych osobowych). Moduł domenowy zna tylko port. Obrazowanie w całości: `12-obrazowanie-dicom.md`.

```
packages/modules/integrations/src/
  ports/      p1-gateway.ts  sms-sender.ts  email-sender.ts  accounting-export.ts
              booking-channel.ts  fiscal-printer.ts  file-storage.ts  llm.ts  dicom-web.ts  bridge.ts
  adapters/   p1-medfile/  sms-smsapi/  email-m365/  optima-export/  docplanner/
              fiscal-posnet/  storage-s3/  orthanc/  bridge-ws/
  testing/    fake-p1.ts  fake-sms.ts  …
  contracts/  testy kontraktowe adapterów (nagrania odpowiedzi, odtwarzane w CI)
```

## 1. Mapa integracji

| Integracja | Cel | Kierunek | Faza | Priorytet | Stan ustaleń (5.11.2026) |
|---|---|---|---|---|---|
| Bramka SMS (polski dostawca, np. SMSAPI) | przypomnienia, potwierdzenia „TAK”, recall, kody jednorazowe | Crux → pacjent; odpowiedzi zwrotne (webhook) | F1 | krytyczny | do wyboru dostawcy z serwerami w UE i DPA; nadawca alfanumeryczny „ZENIT” wymaga rejestracji |
| Import z obecnego programu | pacjenci, wizyty przyszłe, salda, plany, archiwum dokumentacji (F4) | jednorazowo + delta | F1 | krytyczny | **F0: ustalić, jaki program i jaki eksport** (CSV, Firebird/SQL, XML) |
| Rezerwacja online na zenitstomatologia.pl | własny formularz (Z1, Z2 dla nowych pacjentów) | strona → Crux | F1 | wysoki | publiczna część `apps/web/app/(public)/rezerwacja`; adres dla pacjenta `zenitstomatologia.pl/rezerwacja` (rewrite ze strony do `crux.zenitstomatologia.pl`), zapasowo `rezerwacja.zenitstomatologia.pl` (ADR-033) |
| ZnanyLekarz (Docplanner) | synchronizacja kalendarza, rezerwacje z profilu | dwukierunkowo | F1/F2 | wysoki | [Docplanner Integrations API](https://docplanner.github.io/integrations-hub-front-app/guide/): REST, **wyłącznie dla producentów oprogramowania medycznego**, dostęp per klient do autoryzowanych zasobów, SDK PHP i .NET, Postman; zasoby: kalendarze, sloty, rezerwacje, obecność pacjenta, NFZ; proces integracji i limity na osobnych stronach; **ZENIT LABS występuje jako producent** |
| Comarch Optima | eksport sprzedaży, płatności i danych do faktur; KSeF po stronie Optimy | Crux → Optima | F2 | wysoki | format do ustalenia z biurem rachunkowym (plik importu Optimy lub Comarch API) |
| Drukarka fiskalna | paragon po płatności | Crux → agent → drukarka | F3 | średni | protokoły producentów (Posnet, Novitus, Elzab) przez `apps/bridge`; do F3 numer paragonu ręcznie |
| E-mail transakcyjny | kosztorysy (link), potwierdzenia, raport „Koniec dnia” dla zarządu | Crux → odbiorca | F2 | średni | Microsoft 365 organizacji (Graph API) lub dostawca z UE |
| Microsoft Entra ID | logowanie personelu (SSO) | dwukierunkowo | F3 | średni | Supabase Auth z dostawcą OIDC; konta nadal imienne w `staff_members` |
| P1 przez bramkę | zdarzenia medyczne, EDM (indeks + repozytorium), e-recepta, e-skierowanie | Crux → P1 | F4 | krytyczny dla F4 | [Medfile Konektor API EDM](https://www.medfile.pl/api-erecepta-ezla) potwierdzony jako oferta dla zewnętrznych producentów (sekcja 2) |
| Romexis / Orthanc / skanery | otwarcie pacjenta, badania DICOM, worklist, STL | obie strony | F5 | wysoki | `12-obrazowanie-dicom.md` |
| Terminal płatniczy | kwota na terminal, potwierdzenie | Crux → terminal | F5 | niski | zależnie od operatora (np. protokół ECR) |
| Dostawca LLM | szkice, transkrypcja | Crux → dostawca w UE | F6 | niski | ADR-024 |

## 2. P1 (system e-zdrowie)

### 2.1 Obowiązki i standardy

- Zdarzenie medyczne po każdym udzielonym świadczeniu (dane usługodawcy z kodem resortowym, wykonawcy z NPWZ, pacjenta z PESEL lub dokumentem, rodzaj świadczenia, rozpoznanie ICD-10, procedury ICD-9 PL, daty). Format: **HL7 FHIR** w profilu CeZ.
- Dokumenty EDM (dla gabinetu: informacja o rozpoznaniu/świadczeniach/zaleceniach, **opis badania diagnostycznego, czyli opis RTG/CBCT**, e-recepta, e-skierowanie): **HL7 CDA** (Polska Implementacja Krajowa), podpisane (certyfikat ZUS lekarza, podpis kwalifikowany lub zaufany), **indeksowane w P1**, przechowywane w repozytorium usługodawcy (IHE XDS.b) lub repozytorium bramki.
- Uwierzytelnienie usługodawcy: certyfikaty TLS i WSS wydane przez CeZ dla podmiotu z RPWDL; środowisko integracyjne i produkcyjne. Przy bramce certyfikaty podmiotu i tak trzeba wygenerować (Medfile: „kontakt z P1 w celu wygenerowania certyfikatów”).

### 2.2 Ścieżka: bramka Medfile (ADR-011)

Ustalenia ze strony Medfile (5.11.2026): usługi e-recepta, e-skierowanie, eZLA, eWUŚ, zdarzenia medyczne P1, dokumentacja (recepty, skierowania, zaświadczenia, rozpoznania, pobyty), baza leków, słowniki ICD-9/ICD-10, repozytorium XDS.b; REST z JSON (odpowiedź Medfile + oryginalna odpowiedź dostawcy), XML dla dokumentów i zaawansowanych przypadków (zdarzenia medyczne, XDS.b), wzmianka o FHIR i CDA; Swagger/OpenAPI 3; środowisko testowe po NDA (`integracja@medfile.pl`), identyfikator integratora (UUID) + sekret do podpisywania JWT; produkcja po umowie, z listą adresów IP lub VPN; podpisane dokumenty XML dołączane na życzenie; certyfikaty ZUS przechowywane w prywatnym kontenerze; cena zależna od zakresu, umowa roczna lub bezterminowa; **nie wymaga konta Medfile**.

Zadania F0 (organizacyjne, bez kodu): zapytanie ofertowe z zakresem (ZM, EDM indeks + repozytorium, e-recepta, e-skierowanie, 4 gabinety, ~10 lekarzy), NDA, dostęp do środowiska testowego, pytania: SLA, obsługa odrzuceń P1, przechowywanie dokumentów (czy repozytorium u Medfile = podprzetwarzający), sposób podpisu (certyfikat ZUS lekarza w kontenerze Medfile vs podpis po naszej stronie), eksport przy rozwiązaniu umowy.

### 2.3 Port i przepływ

```ts
interface P1Gateway {
  reportMedicalEvent(input: MedicalEventInput): Promise<Result<{ p1EventId: string }, P1Error>>;
  indexDocument(input: EdmDocumentInput): Promise<Result<{ p1DocumentId: string }, P1Error>>;
  issuePrescription(input: PrescriptionInput): Promise<Result<PrescriptionIssued, P1Error>>;
  issueReferral(input: ReferralInput): Promise<Result<ReferralIssued, P1Error>>;
  getStatus(ref: P1Ref): Promise<Result<P1Status, P1Error>>;
}
```

Przepływ: `encounter.closed` → outbox `p1.medical_event.report` → worker buduje Bundle w `@crux/interop` z danych wizyty → `P1Gateway.reportMedicalEvent` → status w `medical_event_reports` (`pending` → `accepted` | `rejected` z kodem). Odrzucone trafiają na listę zadań kierownika z czytelnym powodem i przyciskiem „popraw i wyślij ponownie” (korekta wpisu = nowa wersja, nowe zgłoszenie). Dokument EDM: `entry_version.signed` typu `imaging_report`/`diagnosis_info` → CDA → podpis → `indexDocument`.

Plan B (natywnie): certyfikaty z CeZ, implementacja FHIR/CDA w `@crux/interop` (już i tak istnieje jako ACL), podpis XAdES biblioteką w workerze, testy w środowisku integracyjnym CeZ. Plan C (awaria lub przejściowo): gabinet.gov.pl ręcznie przez lekarza; Crux pokazuje listę wizyt „do zgłoszenia ręcznie” i pozwala wpisać identyfikator zdarzenia.

## 3. Komunikacja z pacjentem

- **SMS:** port `SmsSender` (wyślij, status, odbierz odpowiedź). Dostawca z serwerami w UE, DPA, webhook doręczeń i odpowiedzi, nadawca „ZENIT”. Szablony w `message_templates` (wersjonowane) z tonem księgi znaku: Pan/Pani, konkretnie, bez wykrzykników. Godziny wysyłki 8:00–20:00 (poza tym kolejkowane). Odpowiedź „TAK” → `appointment.confirmed`; „NIE” → zadanie dla recepcji; „STOP” → odwołanie zgody marketingowej.
- **Przypomnienia:** 48 h przed wizytą (z prośbą o potwierdzenie), 2 h przed (krótkie). Dedupe przez `outbox.dedupe_key`. Przesunięcie wizyty unieważnia zaplanowane przypomnienia (worker sprawdza `appointment.updated_at` przed wysyłką).
- **E-mail:** kosztorysy i dokumenty tylko jako link do pobrania z kodem SMS (nigdy załącznik z danymi medycznymi).
- **Treść nie jest przechowywana w `messages`** (tylko skrót i szablon + zmienne odtwarzalne z danych); pełna treść w logu dostawcy podlega jego retencji (sprawdzić w DPA).

## 4. Rezerwacje zewnętrzne

- **ZnanyLekarz:** adapter `docplanner` realizuje port `BookingChannel` (publikuj dostępność, przyjmij rezerwację, anuluj, potwierdź). Dostępność liczona z `findFreeSlots` dla usług oznaczonych jako publiczne; rezerwacja tworzy `appointment` ze `source = znanylekarz`, pacjent dopasowany po telefonie/e-mailu albo tworzony jako „niezweryfikowany” do potwierdzenia przez recepcję. Wymaga wniosku o dostęp do API jako producent oprogramowania (F0: wysłać, bo proces trwa).
- **Własna rezerwacja online:** `apps/web/app/(public)/rezerwacja`: wybór gabinetu lub „najbliższy wolny termin w sieci”, usługi Z1/Z2 dla nowych pacjentów, potwierdzenie kodem SMS, bez zakładania konta, honeypot + limit prób. Tworzy wizytę `scheduled` ze `source = online` i pacjenta do weryfikacji.

## 5. Księgowość i fiskalizacja

- **Optima:** port `AccountingExport` (eksport sprzedaży dnia, płatności, dane do faktur). Adapter generuje plik w formacie uzgodnionym z biurem (CSV/XML importu Optimy) lub woła Comarch API; raport uzgodnień dziennych (kasa vs płatności w Crux). KSeF obsługuje Optima; Faktury wystawia Optima; Crux tworzy `invoice_requests`.
- **Kasa/drukarka fiskalna:** do F3 paragon ręcznie, numer wpisywany przy płatności; od F3 port `FiscalPrinter` przez `apps/bridge` (komenda `print_receipt` z pozycjami i stawką VAT „zw”), odpowiedź z numerem paragonu zapisywana w `payments.receipt_number`.

## 6. Import z obecnego programu (F1)

1. F0: identyfikacja programu i eksportu (CSV, Firebird, SQL, XML z dokumentacją); próbny eksport; mapowanie pól do `03a`.
2. Skrypt `apps/worker/src/migration/<program>/` z raportem: zaimportowane, odrzucone z powodem, duplikaty do ręcznego scalenia; idempotentny (klucz zewnętrzny `legacy_id` w tabeli `platform.legacy_refs`).
3. Import próbny na stagingu z danymi zanonimizowanymi; walidacja przez recepcję na 50 losowych kartach; import produkcyjny w sobotę wieczorem przed startem F1 w gabinecie.
4. Dokumentacja medyczna: nie w F1. W F4 jako dokumenty archiwalne (PDF/XML) przypięte do pacjenta z adnotacją źródła i daty importu, plus wpis `examination` ze stanem uzębienia.

## 7. Zasady wspólne

- Payload outboxa to identyfikatory. Adapter dociąga dane w chwili wysyłki w transakcji workera (RLS workera).
- Każdy adapter ma test kontraktowy na nagranych odpowiedziach (bez danych osobowych) i atrapę do środowiska lokalnego (`FAKE_INTEGRATIONS=1`).
- Klucze i sekrety integracji w menedżerze sekretów (Vercel/Hetzner), rotowane raz w roku; nigdy w repo.
- Ekran „Integracje” (F1) dla kierownika: stan każdej integracji, ostatnie błędy, kolejka `dead`, przycisk „ponów”.
