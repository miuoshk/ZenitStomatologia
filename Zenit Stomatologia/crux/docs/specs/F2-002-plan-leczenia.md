# F2-002 · Plan leczenia z wariantami i kosztorysem

Status: gotowa do planu
Moduły: @crux/planning, @crux/catalog, @crux/patients, @crux/platform, @crux/integrations (pliki)
Właściciel: Miłosz
Prompt: `prompts/F2-plany-finanse.md#K02` (akceptacja: `#K03`)

## Problem

Plan leczenia powstaje na kartce albo w głowie lekarza. Pacjent dostaje cenę ustnie, potem nie pamięta. Nikt nie wie, ile planów czeka na decyzję ani ile pieniędzy „leży” w zaakceptowanych planach bez terminu. Zmiana cennika psuje ceny obiecane wcześniej.

## Rozwiązanie w skrócie

Plan leczenia z wariantami (np. korona vs onlay), etapami i pozycjami z cennika; kosztorys PDF w szacie marki przedstawiany pacjentowi; akceptacja zamraża ceny i zapisuje dokładnie to, co pacjent widział; lejek planów i wartość planów otwartych na pulpitach.

## Historie użytkownika

- Jako lekarz chcę w 2 minuty ułożyć plan z dwoma wariantami i pokazać pacjentowi kosztorys.
- Jako pacjent chcę dostać czytelny kosztorys z ceną każdej pozycji i terminem ważności.
- Jako recepcja chcę umawiać wizyty z pozycji planu, żeby plan „sam się realizował”.
- Jako zarząd chcę wiedzieć, ile planów przedstawiono, ile zaakceptowano i ile zostało do wykonania.

## Kryteria akceptacji

1. **Dane:** lekarz, pacjent, aktywny cennik. **Gdy:** tworzy plan z wariantem A (3 pozycje) i B (2 pozycje). **Wtedy:** każda pozycja ma `list_price` z `priceFor(service, gabinet, dziś)`, sumy per etap i wariant są zgodne co do grosza (`Money`), plan ma status `draft`.
2. **Dane:** plan `draft` bez pozycji. **Gdy:** „Przedstaw pacjentowi”. **Wtedy:** błąd `plan_empty`; z ≥ 1 pozycją w ≥ 1 wariancie przechodzi.
3. **Dane:** plan przedstawiony. **Gdy:** `presentPlan`. **Wtedy:** dla każdego wariantu powstaje `estimates` (snapshot JSON, PDF, `content_hash`), plan ma `presented_at`, `valid_until = +90 dni`, status `presented`; PDF zawiera numer gabinetu, pozycje z kolorem kategorii, sumę, ważność i nazwisko lekarza; brak danych medycznych poza nazwami usług i zębami.
4. **Dane:** plan `presented`. **Gdy:** pacjent akceptuje wariant B na tablecie. **Wtedy:** `plan_acceptances` ma wpis z `estimate_id` wariantu B, metodą i podpisem, plan ma status `accepted` i `accepted_variant_id = B`; pozycje wariantu A dostają `dropped`.
5. **Dane:** plan `accepted`; cennik zmieniony (ceny +10%). **Gdy:** odczyt planu i rozliczenie procedury z pozycji planu. **Wtedy:** ceny pozycji niezmienione (zamrożone); test porównuje `final_price` przed i po aktywacji nowego cennika.
6. **Dane:** plan `accepted`. **Gdy:** ktoś próbuje zmienić pozycję (`updateItem`). **Wtedy:** błąd `plan_frozen`; zmiana wymaga nowego planu lub aneksu (nowy wariant w nowym planie z odwołaniem `supersedes_plan_id`).
7. **Dane:** pozycja planu umówiona na wizytę. **Gdy:** wizyta jest `completed` i rozliczona z tą pozycją (F2) lub procedura zapisana (F4). **Wtedy:** pozycja `done`; gdy wszystkie pozycje `done`/`dropped`, plan `completed` z `completed_at`.
8. **Dane:** plan `presented` z `valid_until` wczoraj. **Gdy:** worker nocny. **Wtedy:** status `expired`, zdarzenie `plan.expired.v1`; recepcja widzi go na liście „do odnowienia”.
9. **Dane:** użytkownik tenanta B lub recepcja bez `plan.read`. **Gdy:** odczyt planu. **Wtedy:** brak dostępu (RLS / `authorize`); `estimates` nie da się zmienić ani usunąć (`42501`).

## Dane

| Zmiana | Tabela / pole | Uwagi |
|---|---|---|
| nowe | `treatment_plans`, `plan_variants`, `plan_stages`, `plan_items`, `estimates`, `plan_acceptances` | `03a`, sekcja 8; `estimates`, `plan_acceptances` append-only |
| nowa | `appointment_plan_items` (`appointment_id`, `plan_item_id`) | łącznik z terminarzem |
| nowa/wspólna | `files` | metadane PDF i podpisów (`FileStoragePort`) |

## Uprawnienia

| Rola | Może |
|---|---|
| lekarz | tworzyć, edytować `draft`, przedstawiać, kończyć |
| recepcja | czytać, umawiać z pozycji, oznaczać akceptację papierową (`plan.accept_paper`) |
| asystentka | uruchomić tryb akceptacji na tablecie |
| kierownik | wszystko w gabinecie + rabaty powyżej progu (`plan.discount_high`) |
| zarząd | wszystko |

## Zdarzenia i integracje

- publikuje: `plan.presented.v1`, `plan.accepted.v1`, `plan.declined.v1`, `plan.expired.v1`, `plan.completed.v1`
- reaguje na: `appointment.settled.v1` (F2-004), `procedure.recorded.v1` (F4)
- outbox: generowanie PDF w workerze; SMS z linkiem do kosztorysu (kod SMS) przez `messaging`

## Audyt i prawo

Kosztorys jako dowód ceny przedstawionej konsumentowi (prawo konsumenckie) i element dokumentacji od F4 (plan leczenia jest częścią dokumentacji indywidualnej). Akceptacja na tablecie: forma do potwierdzenia przez prawnika (`04`, pytanie 5); do tego czasu równolegle wydruk do podpisu na życzenie. Łańcuch skrótów w `plan_acceptances`.

## UI

Edytor planu (warianty jako zakładki, etapy, pozycje, `ToothPicker`, rabat z powodem, suma na żywo), podgląd PDF, lista `/plany` z filtrami i wartością, zakładka w karcie pacjenta, tryb kiosku `/akceptacja/[token]`. Stany: brak cennika („Brak ceny dla usługi X w gabinecie 02. Uzupełnij cennik.”), plan wygasły z akcją „Odnów”.

## Poza zakresem

Finansowanie ratalne (F6), portal pacjenta, automatyczne propozycje planu.

## Otwarte pytania

- Próg rabatu wymagający kierownika: 10% czy kwota? (propozycja: 10% lub 500 zł)
- Czy pacjent może zaakceptować część wariantu? (propozycja: nie; etapy dają elastyczność)
