# Korekta wpisu (procedura udokumentowana)

**Właściciel:** Miłosz (administrator sieci) · **Data przeglądu:** 2026-11-25 · **Cel:** spełnienie § 1 ust. 6 pkt 1 rozporządzenia MZ z 6.04.2020 — zmiany w dokumentacji nie mogą ukrywać pierwotnej treści; korekta to udokumentowana, śledzona operacja.

## Zasada

Crux **nie usuwa i nie nadpisuje** wpisów. Korekta = **unieważnienie z powodem** (lub nowa wersja) + nowy wpis. Pierwotna treść zostaje w danych i w `audit.events` (wartość przed i po, aktor, powód, `request_id`).

## Zakres w wydaniu 1.0

| Obiekt | Jak poprawić | Kto | Uprawnienie |
|---|---|---|---|
| Wpis obłożenia fotela (`chair_occupancy`) | unieważnij wpis z powodem, dodaj poprawny | `receptionist`, `location_manager` | `occupancy.write`; dzień zamknięty: `occupancy.write_closed` + powód |
| Konfiguracja (gabinety, fotele, godziny, wyjątki, ustawienia) | zmiana przez ekran `/ustawienia/*` (nowy zakres obowiązywania, nie edycja wstecz) | `network_admin` | `org.manage` |

Dane pacjentów, wpisy kliniczne, zgody, płatności: od 1.1 (nowa podpisana wersja z powodem lub storno).

## Kroki

1. Zidentyfikuj wpis (gabinet, fotel, data, godzina). **Nie wpisuj danych pacjenta** w powodzie ani notatce (`containsPii` odrzuca PESEL, telefon, e-mail).
2. Wybierz „Unieważnij” / zmień konfigurację i **wpisz powód** (obowiązkowy, rzeczowy, np. „błędnie wskazany fotel”).
3. Dodaj poprawny wpis.
4. Sprawdź w „Historia zmian” (`audit.read`): widać aktora, czas serwera, powód, wartość przed i po.
5. Przy sporze: wyszukaj po `request_id` (nagłówek `x-request-id`, kolumna `audit.events.request_id`).

## Czego nie robić

Ręczne `UPDATE`/`DELETE` w bazie, zmiana wpisu „bez śladu”, korekta bez powodu, korekta cudzym kontem.
