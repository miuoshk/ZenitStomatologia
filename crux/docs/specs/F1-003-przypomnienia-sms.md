# F1-003 · Przypomnienia i potwierdzenia SMS

Status: gotowa do planu
Moduły: @crux/messaging, @crux/scheduling, @crux/integrations, @crux/platform
Właściciel: Miłosz
Prompt: `prompts/F1-pacjenci-terminarz.md#K07`

## Problem

Recepcja dzwoni ręcznie dzień przed wizytą, nie zawsze do wszystkich. Nieobecności zjadają fotele. Pacjent, który chce odwołać, nie wie jak, więc nie odwołuje.

## Rozwiązanie w skrócie

Automatyczne SMS-y 48 h przed wizytą z prośbą o potwierdzenie (TAK/NIE) i 2 h przed jako krótkie przypomnienie, z szablonami w tonie marki, oknem wysyłki 8:00–20:00, statusami doręczeń i obsługą odpowiedzi. Treść nie zawiera danych medycznych.

## Historie użytkownika

- Jako pacjent chcę dostać przypomnienie z adresem gabinetu i móc potwierdzić jednym słowem.
- Jako recepcja chcę widzieć, które wizyty jutro są niepotwierdzone, żeby zadzwonić tylko do nich.
- Jako kierownik chcę wiedzieć, ile SMS-ów nie dotarło i dlaczego.

## Kryteria akceptacji

1. **Dane:** wizyta umówiona na za 5 dni, pacjent z `preferred_channel = sms`. **Gdy:** worker uruchamia `reminders.schedule`. **Wtedy:** powstają dwie wiadomości `queued` z `scheduled_for` = 48 h i 2 h przed wizytą i `dedupe_key` per wizyta i typ; ponowne uruchomienie nie tworzy duplikatów.
2. **Dane:** wiadomość `queued` z `scheduled_for` 21:30. **Gdy:** worker wysyła. **Wtedy:** wysyłka jest przesunięta na 8:00 następnego dnia (okno 8–20), chyba że wizyta jest wcześniej niż 8:00 (wtedy wysyłka poprzedniego dnia o 19:00).
3. **Dane:** wizyta przesunięta po utworzeniu przypomnienia. **Gdy:** worker wysyła. **Wtedy:** stare przypomnienie zostaje `cancelled`, nowe powstaje dla nowego terminu; pacjent dostaje SMS `appointment.moved` natychmiast (w oknie).
4. **Dane:** pacjent odpowiada „TAK” (także „tak”, „Tak.”). **Gdy:** webhook dostawcy. **Wtedy:** wizyta `confirmed` z `confirmed_via = sms`, wiadomość `replied`; odpowiedź „NIE” tworzy zadanie dla recepcji na ekranie Dziś; „STOP” cofa zgodę marketingową i nie wpływa na przypomnienia.
5. **Dane:** szablon przypomnienia. **Gdy:** test szablonów. **Wtedy:** żaden szablon przypomnień nie zawiera zmiennych `{service}`, `{diagnosis}`, `{amount}` ani słów z listy klinicznej; treść ma formę Pan/Pani i brak wykrzykników.
6. **Dane:** dostawca zwraca błąd doręczenia. **Gdy:** webhook statusu. **Wtedy:** wiadomość `failed` z `error_code`; po 2 nieudanych wysyłkach wizyta trafia na listę „do telefonu” na Dziś.
7. **Dane:** pacjent z `preferred_channel = phone`. **Gdy:** `reminders.schedule`. **Wtedy:** nie powstaje SMS; powstaje zadanie dla recepcji.
8. **Dane:** użytkownik tenanta B. **Gdy:** czyta `messages`. **Wtedy:** nie widzi wiadomości tenanta A; `messages` nie zawiera treści ani numeru (tylko skróty), więc nawet eksport tabeli nie ujawnia danych.

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowe | `message_templates`, `messages`, `channel_consents` | `03a`, sekcja 6; `messages` append-only poza statusem (worker) |
| nowy port | `SmsSender` | adapter dostawcy z UE + atrapa |

## Uprawnienia

| Rola | Może |
|---|---|
| recepcja | wysłać przypomnienie teraz, SMS własny (transakcyjny, limit 2/dobę), czytać historię |
| kierownik | edytować szablony (`messaging.templates`), widzieć statystyki |
| zarząd | jak kierownik, wszystkie gabinety |

## Zdarzenia i integracje

- publikuje: `message.sent.v1`, `message.failed.v1`, `sms.reply.v1`
- reaguje na: `appointment.booked.v1`, `appointment.moved.v1`, `appointment.transferred.v1`, `appointment.cancelled.v1`
- outbox: wysyłka przez worker; webhooki przychodzące w `apps/web/app/api/webhooks/sms` z weryfikacją podpisu

## Audyt i prawo

Przypomnienia o wizycie to komunikacja w ramach usługi (bez zgody marketingowej); marketing wymaga zgody (PKE). Treść bez danych medycznych. `messages` przechowuje tylko skróty numeru i treści. Retencja 13 miesięcy.

## UI

Panel wizyty: historia wiadomości ze statusem (ikona + słowo), przyciski. `/ustawienia/szablony`. Dziś: lista niepotwierdzonych jutro i odpowiedzi „NIE”. `/integracje`: skrzynka odpowiedzi nierozpoznanych.

## Poza zakresem

Recall i kampanie (F3-006, F3-007), e-mail (F2), czat dwukierunkowy.

## Otwarte pytania

- Nadawca alfanumeryczny „ZENIT” czy numer z możliwością odpowiedzi? (odpowiedzi wymagają numeru; propozycja: numer dedykowany z nazwą w treści)
