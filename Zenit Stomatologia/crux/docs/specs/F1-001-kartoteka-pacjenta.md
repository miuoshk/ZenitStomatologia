# F1-001 · Kartoteka pacjenta

Status: gotowa do planu
Moduły: @crux/patients, @crux/platform, @crux/identity
Właściciel: Miłosz
Prompt: `prompts/F1-pacjenci-terminarz.md#K01`

## Problem

Dziś pacjent istnieje osobno w każdym gabinecie (a czasem dwa razy w jednym), więc recepcja w 02 nie wie, że pacjent z 01 ma plan leczenia, a przy przeprowadzce kartoteki powstają duplikaty. PESEL leży w bazie jawnie. Nikt nie wie, kto i kiedy oglądał kartę.

## Rozwiązanie w skrócie

Jedna kartoteka na podmiot leczniczy z numerem karty, szyfrowanym PESEL-em, wykrywaniem duplikatów przy zakładaniu, scalaniem z audytem, opiekunami, upoważnieniami i logiem każdego otwarcia karty.

## Historie użytkownika

- Jako recepcja chcę znaleźć pacjenta po nazwisku, telefonie, numerze karty lub PESEL-u w mniej niż sekundę, żeby nie zatrzymywać kolejki.
- Jako recepcja chcę przy zakładaniu zobaczyć podobnych pacjentów, żeby nie tworzyć duplikatu.
- Jako kierownik chcę scalić duplikaty z powodem, żeby historia była w jednym miejscu i nic nie zginęło.
- Jako lekarz chcę widzieć opiekuna małoletniego i upoważnione osoby, żeby wiedzieć, komu mogę udzielać informacji.
- Jako inspektor/zarząd chcę wiedzieć, kto otwierał kartę pacjenta, żeby odpowiedzieć na pytanie pacjenta lub UODO.

## Kryteria akceptacji

1. **Dane:** tenant A, recepcja gabinetu 01. **Gdy:** zakłada pacjenta z PESEL-em o poprawnej sumie kontrolnej. **Wtedy:** pacjent dostaje kolejny numer karty w formacie `ZS-000123`, PESEL jest zapisany jako `enc:v1:…` i HMAC, data urodzenia i płeć są wypełnione z PESEL-u, rekord jest widoczny z gabinetu 02 tego samego tenanta.
2. **Dane:** istnieje pacjent „Kowalska, 1985-03-02, tel. +48…”. **Gdy:** recepcja zakłada pacjenta o tym samym nazwisku i dacie urodzenia lub tym samym telefonie bez `confirmNotDuplicate`. **Wtedy:** system zwraca listę podobnych (z punktacją) i nie tworzy rekordu; z `confirmNotDuplicate = true` tworzy.
3. **Dane:** dwa rekordy tej samej osoby. **Gdy:** kierownik scala B w A z powodem. **Wtedy:** B ma `merged_into_id = A`, wszystkie wizyty i zlecenia B wskazują na A, `patient_merges` ma wpis, nic nie zostało usunięte, wyszukiwanie B otwiera A z informacją o scaleniu.
4. **Dane:** użytkownik tenanta B. **Gdy:** próbuje odczytać pacjenta tenanta A (UI, server action, SQL). **Wtedy:** nie widzi go (RLS), a próba przez server action zapisuje `forbidden` w audycie.
5. **Dane:** lekarz otwiera kartę pacjenta. **Gdy:** strona karty się ładuje. **Wtedy:** `audit.access_log` ma wpis (`patient_record`, `view`, aktor, gabinet, czas) i nie zawiera danych osobowych poza identyfikatorami.
6. **Dane:** PESEL o błędnej sumie kontrolnej lub data urodzenia niezgodna z PESEL-em. **Gdy:** zapis. **Wtedy:** błąd walidacji z komunikatem, co poprawić; rekord nie powstaje.
7. **Dane:** 50 000 pacjentów z zestawu wzorcowego. **Gdy:** wyszukiwanie „kowal 1985”. **Wtedy:** wynik w < 300 ms (p95) i zawiera dopasowania po nazwisku i roku urodzenia.

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| rozszerzenie | `patients` (kolumny z `03a`, sekcja 4) | tylko expand; RLS `tenant_all`; audyt bez `*_enc` |
| nowa | `guardians` | `tenant_all` |
| nowa | `patient_authorizations` | append-only + `revoked_at` |
| nowa | `patient_merges` | append-only |
| nowa | `patient_counters` | licznik numerów per tenant |
| nowy widok | `patients_resolved` | rozwiązuje scalenia |

## Uprawnienia

| Rola | Może |
|---|---|
| recepcja | czytać, zakładać, edytować kontakt i adres, dodawać opiekunów |
| lekarz, higienistka, asystentka | czytać, dodawać opiekunów i upoważnienia |
| kierownik | wszystko + scalanie (`patient.merge`) + eksport (`patient.export`) |
| zarząd | jak kierownik dla wszystkich gabinetów |
| audytor | historia dostępu (`audit.read`) |

## Zdarzenia i integracje

- publikuje: `patient.created.v1`, `patient.merged.v1`, `patient.updated.v1`
- reaguje na: —
- outbox: brak wysyłek zewnętrznych w tej funkcji

## Audyt i prawo

Trigger audytu na wszystkich tabelach; log dostępu przy otwarciu karty, eksporcie, wydruku. PESEL: dane szczególne (identyfikacja), szyfrowane (ADR-025). Upoważnienia i opiekunowie: art. 26 ustawy o prawach pacjenta. Małoletni: reguła zgody łącznej od 16 lat (używana w F2/F4).

## UI

`/pacjenci` (lista, wyszukiwanie), `/pacjenci/nowy` (z panelem podobnych), `/pacjenci/[id]` (karta z zakładkami), `PatientSearch` w górnym pasku (`Ctrl+K`). Stany: brak wyników („Nie znaleziono. Załóż nowego pacjenta”), ładowanie bez migania, brak uprawnień. iPad: pola 44 px. PESEL maskowany poza edycją.

## Poza zakresem

Dokumentacja medyczna, saldo, wizyty (inne specyfikacje). Portal pacjenta. Import (F1-006).

## Otwarte pytania

- Czy pacjent bez PESEL-u (obcokrajowiec) może mieć pusty dokument tożsamości do czasu pierwszej wizyty? (propozycja: tak, flaga `unverified`)
