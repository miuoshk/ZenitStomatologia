# F4-001 · Wizyta kliniczna i wpis z podpisem wewnętrznym

Status: gotowa do planu (realizacja po opinii prawnej i przejściu na Supabase Team)
Moduły: @crux/clinical, @crux/patients, @crux/scheduling, @crux/identity, @crux/platform, @crux/integrations (pliki)
Właściciel: Miłosz
Prompt: `prompts/F4-dokumentacja-p1.md#K01`
Podstawa: `docs/04`, sekcje 2–4 (rozporządzenie MZ z 6.04.2020: § 1 ust. 6, § 4 ust. 1–4)

## Problem

Dokumentacja w obecnym programie jest edytowalna bez śladu, podpis to login, a eksport całości jest niepewny. Przy czterech gabinetach lekarz nie widzi wpisów z innego gabinetu. Rozporządzenie wymaga integralności, identyfikacji autora i czasu każdej zmiany oraz eksportu całości.

## Rozwiązanie w skrócie

Wizyta kliniczna (`encounter`) z wpisami, które po podpisie są niezmienne; korekta to nowa, podpisana wersja z powodem; łańcuch skrótów per pacjent; podpis wewnętrzny Crux (konto + MFA + czas serwera + skrót); recepcja nie widzi treści; każdy odczyt jest logowany; eksport wizyty do PDF.

## Historie użytkownika

- Jako lekarz chcę napisać wpis w minutę z szablonu dla usługi i podpisać go jednym gestem, mając pewność, że nikt go nie zmieni bez śladu.
- Jako lekarz chcę poprawić literówkę po podpisie i żeby poprawka była widoczna jako korekta z powodem.
- Jako lekarz w gabinecie 02 chcę widzieć wpisy z 01 tego samego pacjenta.
- Jako zarząd chcę mieć pewność, że dokumentacja spełnia rozporządzenie i da się ją wyeksportować w całości.

## Kryteria akceptacji

1. **Dane:** wizyta `in_chair` lekarza z NPWZ. **Gdy:** otwiera wizytę kliniczną. **Wtedy:** powstaje `encounter` (`open`) powiązany z `appointment`, gabinetem i wykonawcą; drugi `encounter` dla tej samej wizyty jest odrzucany.
2. **Dane:** `encounter` otwarty. **Gdy:** lekarz dodaje wpis `examination` z szablonu i podpisuje. **Wtedy:** `entry_versions` ma wersję 1 z `signed_by`, `signed_at` (czas serwera), `content_hash`, `prev_hash` równym ostatniemu skrótowi pacjenta; audyt ma akcję `sign`; zdarzenie `clinical_entry.signed.v1` w outboxie.
3. **Dane:** wersja podpisana. **Gdy:** ktokolwiek próbuje `UPDATE` lub `DELETE` na `entry_versions` (SQL, server action). **Wtedy:** `42501`; interfejs ma tylko przycisk „koryguj”.
4. **Dane:** wersja 1 podpisana. **Gdy:** lekarz koryguje z powodem „błędny numer zęba”. **Wtedy:** powstaje wersja 2 (podpisana, `correction_reason`, `prev_hash` = hash wersji 1), wersja 1 pozostaje czytelna w historii, widok domyślny pokazuje wersję 2 z adnotacją „korekta”.
5. **Dane:** użytkownik bez NPWZ (asystentka) lub higienistka poza zakresem. **Gdy:** próbuje podpisać wpis typu `diagnosis`. **Wtedy:** odrzucone `signature_not_allowed`; higienistka może podpisać `examination` i `procedure_note` dla usług Z2 (zakres w `permissions`).
6. **Dane:** `encounter` bez podpisanych wpisów. **Gdy:** zamknięcie. **Wtedy:** błąd `encounter_empty`; z ≥ 1 podpisanym wpisem zamyka się z `closed_at` i publikuje `encounter.closed.v1`.
7. **Dane:** recepcja. **Gdy:** otwiera kartę pacjenta. **Wtedy:** zakładka Dokumentacja jest niewidoczna, a zapytanie do `entry_versions` zwraca 0 wierszy (polityka `clinical_entry.read`).
8. **Dane:** lekarz czyta historię pacjenta. **Gdy:** strona się ładuje. **Wtedy:** `audit.access_log` ma wpis `clinical_entry`/`view` z identyfikatorami wersji; treść nie trafia do logów ani URL.
9. **Dane:** 3 wpisy pacjenta z 2 gabinetów. **Gdy:** worker `integrity.verify`. **Wtedy:** łańcuch jest poprawny; po ręcznej zmianie `content` w bazie testowej (jako superuser) weryfikacja zgłasza niezgodność z identyfikatorem wersji i tworzy incydent.
10. **Dane:** wizyta zamknięta. **Gdy:** eksport PDF wizyty. **Wtedy:** PDF ma nagłówek (podmiot, gabinet z kodem resortowym, pacjent z numerem karty i PESEL-em maskowanym w widoku, pełnym w eksporcie dla uprawnionych, lekarz z NPWZ, daty świadczenia i wpisu), treść wszystkich wersji z oznaczeniem korekt, stopkę z sumą kontrolną; eksport jest w logu dostępu.

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowe | `encounters`, `clinical_entries`, `entry_versions` (append-only), `attachments`, `disclosures`, `edm_documents`, `medical_event_reports` | `03a`, sekcja 13 |
| triggery | `clinical.set_hash()`, blokada niepodpisanej korekty, `retention_until` | `advisory lock` per pacjent |
| nowe uprawnienia | `clinical_entry.read`, `clinical_entry.write`, `clinical_entry.sign`, `clinical_entry.sign_hygiene`, `encounter.close`, `clinical.export` | seed |

## Uprawnienia

| Rola | Może |
|---|---|
| lekarz dentysta | wszystko dla własnych wpisów; czytać wpisy innych lekarzy tego pacjenta |
| higienistka | wpisy `examination`, `procedure_note`, `recommendation` w zakresie Z2 |
| asystentka | czytać (bez podpisu), dodawać załączniki |
| recepcja | nic (poza istnieniem wizyty) |
| kierownik | czytać, eksportować, rejestr udostępnień |
| audytor | log dostępu, raport integralności |

## Zdarzenia i integracje

- publikuje: `encounter.opened.v1`, `clinical_entry.signed.v1`, `clinical_entry.corrected.v1`, `encounter.closed.v1`
- reaguje na: `appointment.in_chair` (propozycja otwarcia wizyty klinicznej)
- outbox: `encounter.closed.v1` → P1 (F4-007); `clinical_entry.signed.v1` typu EDM → CDA (F4-006/007)

## Audyt i prawo

§ 1 ust. 6 pkt 1–4, 7 (mapa w `04`, sekcja 3); § 4 ust. 4 (podpis wewnętrzny, `04`, sekcja 4; wymaga potwierdzenia prawnika co do ponownego uwierzytelnienia przy podpisie). Retencja 20 lat (`retention_until`). Dokumentacja wspólna w tenancie: wpisy z 01 i 02 w jednej karcie; udostępnienie poza tenant tylko przez `disclosures`.

## UI

Ekran wizyty klinicznej na iPadzie i desktopie: trzy kolumny (historia, wpis, odontogram/plan), szablony, podpis z `ConfirmDialog` (ponowne uwierzytelnienie wg flagi), wersje i korekty widoczne, wydruk. Karta pacjenta → Dokumentacja (chronologia, filtry typu i gabinetu). Stany: brak wpisów (rycina szałwii), wpis niepodpisany > 24 h (StatusPill `uwaga` i pozycja na pulpicie lekarza).

## Poza zakresem

Rozpoznania i procedury tabelarycznie (F4-002), odontogram (F4-003), szablony i zgody (F4-004), P1 (F4-007), załączniki i eksport całości (F4-005).

## Otwarte pytania

- Ponowne uwierzytelnienie przy każdym podpisie czy raz na sesję? (prawnik; propozycja: raz na 15 min aktywności)
- Czy asystentka może tworzyć szkic wpisu dla lekarza do podpisu? (propozycja: tak, autor szkicu zapisany, podpis tylko lekarza)
