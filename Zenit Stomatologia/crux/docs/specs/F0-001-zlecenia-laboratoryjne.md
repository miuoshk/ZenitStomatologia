# F0-001 · Zlecenia do pracowni protetycznej

Status: gotowa do planu
Wydanie: 1.1 „Ratania” (wymaga kartoteki F1-001 i terminarza F1-002; ADR-032)
Moduły: @crux/lab, @crux/patients, @crux/scheduling, @crux/org, @crux/identity, @crux/platform
Właściciel: Miłosz
Prompt: `prompts/F1-pacjenci-terminarz.md#K12`

Moduł kopiuje strukturę modułu wzorcowego obłożenia (F0-010, `docs/wzorzec-modulu.md`). Identyfikator F0-001 został (ID są stałe); zlecenie wymaga pacjenta, więc realizacja przesunęła się do wydania 1.1.

## Problem

Asystentki zapisują prace protetyczne w zeszycie lub w Excelu. Zdarza się, że korona nie wraca z pracowni przed wizytą pacjenta, a gabinet dowiaduje się o tym, gdy pacjent siedzi w poczekalni. Koszty pracowni są rozliczane z lekarzami ręcznie.

## Rozwiązanie w skrócie

Lista zleceń do pracowni w każdym gabinecie, z terminem powrotu, kosztem i statusem. Alert dzień przed wizytą, jeśli praca nie wróciła. Zlecenie ma gabinet wysyłki i wizytę oddania, która może być w innym gabinecie.

## Historie użytkownika

- Jako asystentka chcę dodać zlecenie (pacjent, pracownia, rodzaj pracy, zęby, kolor, termin), żeby nic nie zginęło.
- Jako asystentka chcę oznaczyć pracę jako odebraną, żeby lekarz wiedział, że może planować oddanie.
- Jako kierownik gabinetu chcę widzieć prace spóźnione, żeby zadzwonić do pracowni.
- Jako lekarz chcę widzieć moje zlecenia, bo koszt pracowni wchodzi do mojego rozliczenia (F2).

## Kryteria akceptacji

1. **Dane:** asystentka z gabinetu 01, pacjent tenanta A. **Gdy:** dodaje zlecenie z terminem powrotu. **Wtedy:** zlecenie ma status `sent`, `location_id = 01`, `provider_id` = wybrany lekarz, trafia do audytu i na listę gabinetu 01.
2. **Dane:** zlecenie `sent` z terminem powrotu wczorajszym. **Gdy:** otwieram listę. **Wtedy:** zlecenie ma oznaczenie „spóźnione” (ikona + tekst, `StatusPill` `uwaga`), a filtr „spóźnione” je pokazuje.
3. **Dane:** użytkownik tenanta B oraz recepcja gabinetu 02 bez `network.view`. **Gdy:** próbują odczytać zlecenie gabinetu 01 tenanta A (UI, server action, SQL). **Wtedy:** nie widzą go (RLS `tenant_location`).
4. **Dane:** zlecenie `received`. **Gdy:** kierownik zmienia koszt. **Wtedy:** zmiana wymaga powodu (`ConfirmDialog`), bez powodu jest odrzucona na poziomie bazy, a z powodem zapisuje się w audycie z wartością przed i po.
5. **Dane:** zęby `19` lub `11, 11`. **Gdy:** zapis. **Wtedy:** błąd walidacji (FDI, bez duplikatów) z komunikatem, co poprawić.
6. **Dane:** przejścia statusów. **Gdy:** `completed → received` lub `cancelled → sent`. **Wtedy:** odrzucone (`invalid_transition`); `sent → received → fitted → completed` i `cancelled` z każdego poza `completed` przechodzą.

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowa | `dental_labs` | `03a` sekcja 10; `tenant_all` |
| nowa | `lab_orders` | `03a` sekcja 10; `tenant_location`; FK `patient_id → patients` (F1-001) i `return_appointment_id → appointments` (F1-002) |
| enum | `lab_order_status` | sent, received, fitted, completed, cancelled |

## Uprawnienia

| Rola | Może |
|---|---|
| asystentka, lekarz, higienistka | tworzyć, zmieniać status (`lab_order.write`) |
| kierownik | wszystko + koszt (`lab_order.cost`) |
| recepcja | czytać (`lab_order.read`) |
| zarząd | wszystko we wszystkich gabinetach |

## Zdarzenia i integracje

- publikuje: `lab_order.created.v1`, `lab_order.received.v1`, `lab_order.at_risk.v1` (zadanie cykliczne 7:00: zlecenia `sent` z wizytą jutro; konsument: ekran Dziś, F1-005)
- reaguje na: — (2.0: `plan.accepted.v1` dla zleceń z pozycji planu)
- outbox: brak wysyłek zewnętrznych

## Audyt i prawo

Audyt wszystkich zmian; zlecenie zawiera dane pacjenta (nazwisko, zęby), więc podlega RLS i logowi dostępu przy eksporcie listy. Koszt wchodzi do rozliczeń lekarzy (F2), dlatego zmiana kosztu wymaga powodu.

## UI

Ekran `/laboratorium`: `DataTable` z filtrami (status, pracownia, lekarz, spóźnione, gabinet), chip gabinetu w wierszu, `SidePanel` dodawania, `ConfirmDialog` z powodem, `EmptyState` z ryciną mięty („Brak zleceń. Dodaj pierwsze.”). Skróty: `N` nowe zlecenie. iPad: 44 px.

## Poza zakresem

Rozliczenia z pracownią (faktury), komunikacja z pracownią przez system, zlecenia z pozycji planu (F2-007). Wydanie 1.0 nie zawiera tego modułu, bo nie ma w nim danych pacjentów.

## Otwarte pytania

- Lista pracowni wspólna dla tenanta czy per gabinet? (propozycja: wspólna, z flagą „używana w gabinecie”)
