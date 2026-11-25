# 2 · Co dostajemy w wydaniu 1.0 „Krasnodrzew”

## Zakres w jednym zdaniu

Szkielet aplikacji ze wszystkimi strażnikami, logowanie z MFA, role i dostępy, gabinety 01 i 02 z fotelami i godzinami otwarcia, **obłożenie godzinowe foteli** wpisywane ręcznie (bez pacjentów), schemat `analytics` z rejestrem metryk i trzy pulpity (sieć, gabinet, moje), ekrany administracji, worker z kopiami nocnymi, obserwowalność bez danych osobowych, wdrożenie produkcyjne w obu gabinetach.

## Co kto dostaje

| Rola | Co robi w Cruxie 1.0 | Czego jeszcze nie ma (i w którym wydaniu będzie) |
|---|---|---|
| Recepcja | wpisuje obłożenie dnia (fotel × godzina: wykonawca, kategoria Z, opcjonalnie kwota), blokady foteli, „dzień jak wczoraj”, „zamknij dzień” | pacjenci, terminarz, SMS (1.1) |
| Lekarz, higienistka | pulpit „moje”: moje godziny, moja kwota na godzinę, mediana gabinetu bez nazwisk; może wpisać własne godziny | grafik, lista dnia, wpisy kliniczne (1.1, 3.0) |
| Kierownik gabinetu | pulpit gabinetu, tabela wykonawców, zamykanie i ponowne otwieranie dni, poprawki z powodem, nadpisanie godzin otwarcia | grafiki, import ze starego programu (1.1), należności (2.0) |
| Zarząd | pulpit sieci (01 i 02 obok siebie), drążenie do wpisów, link z filtrami, administracja: gabinety, fotele, godziny, personel, role, flagi, cele | plany, konwersja, nieobecności, rankingi (2.0, 2.1) |
| Pacjent | nic się nie zmienia | SMS i rezerwacja online (1.1) |

## Czego celowo nie ma

Pacjentów, wizyt, terminarza, SMS-ów, planów leczenia, płatności, dokumentacji, integracji zewnętrznych (Platforma P1, ZnanyLekarz, Optima). Funkcja, której nie ma w wydaniu, **nie jest widoczna w nawigacji** jako „wkrótce” (zasada z `docs/07`, sekcja 7); nawigacja 1.0 to: Obłożenie, Pulpit, Ustawienia, Integracje (szkielet).

## Jak wygląda dzień recepcji z Cruxem 1.0

1. Rano, po zalogowaniu (hasło + kod z telefonu), recepcja widzi siatkę dnia: kolumny to fotele, wiersze to godziny otwarcia gabinetu.
2. Klika „Dzień jak wczoraj”: wykonawcy i kategorie z wczoraj są skopiowane, kwoty nie. Poprawia różnice strzałkami i klawiszami 1–6.
3. W ciągu dnia dopisuje kwoty, jeśli są znane (z paragonu lub starego programu), albo robi to po południu.
4. Jeśli fotel 3 ma serwis 12:00–14:00, dodaje blokadę; te godziny nie liczą się do pojemności.
5. Przed wyjściem klika „Zamknij dzień”: widzi podsumowanie (godziny, kwoty, fotele bez wpisów) i potwierdza. Od tej chwili zmiana wymaga kierownika i powodu.
6. Pięć minut później pulpit sieci ma nowe dane (worker odświeża analitykę co 5 minut).

Cały proces przy dobrym dniu zajmuje 2–3 minuty. To jest miara bramki 1.0.

## Jak wygląda tydzień zarządu

- poniedziałek: pulpit sieci z filtrem „7 dni”: obłożenie 01 vs 02 jako łuki, przychód na godzinę fotela jako wykres kropkowy, dni niezamknięte na liście;
- klik w kafel „godziny pracy foteli” otwiera listę wpisów, których suma daje tę liczbę (drążenie); CSV do pobrania;
- link z filtrami wysłany wspólnikowi otwiera dokładnie ten widok;
- w Ustawieniach: nowy fotel w 02, konto dla nowej higienistki, cel obłożenia 75% dla 01.

## Krasnodrzew: dlaczego ta nazwa

Każde wydanie dostaje roślinę z zielnika marki (42 tablice z atlasu Köhlera, każda związana z leczeniem jamy ustnej; `Materialy marki/ryciny-kohler/ZIELNIK.md`). Krasnodrzew pospolity, *Erythroxylum coca*, to roślina, z której wzięło się pierwsze znieczulenie miejscowe w stomatologii (1884). Pierwsze wydanie ma znieczulić pierwszy ból sieci: nie wiemy, jak naprawdę pracują fotele. Kolejne: 1.1 Ratania, 2.0 Pięciornik, 2.1 Cynamonowiec, 3.0 Dąb, 4.0 Gutaperkowiec, 5.0 Brzoza. Rycina wydania pojawia się wyłącznie na stronie „O Crux”, w tym podręczniku i w changelogu; interfejs roboczy zostaje czysty (`docs/06`, 3.3).

## Bramka 1.0 (kiedy uznajemy wydanie za udane)

1. Oba gabinety wpisują obłożenie przez 10 kolejnych dni roboczych; `days_closed_rate ≥ 90%` w każdym.
2. Pulpit sieci pokazuje wartości zgodne z sumą wpisów (drążenie); `refreshed_at` nie starsze niż 10 minut w godzinach pracy.
3. Wszystkie konta imienne z MFA; żadnego konta współdzielonego; kierownicy i recepcja przeszkoleni (lista obecności).
4. `pnpm doctor`, testy, e2e zielone na tagu `v1.0.0`; `spec.traceability` pełne dla F0-010 i F0-011.
5. Kopie nocne działają, jedno odtworzenie wykonane i opisane; procedury `docs/ops/` mają właścicieli.
6. Zero zdarzeń `dead` w outboxie przez 10 dni; Sentry bez danych osobowych (zrzut w `docs/ops/`).
7. Retrospektywa z recepcją po 2 tygodniach: czas wpisania dnia ≤ 3 minuty; lista bólów do 1.1.

Źródło i pełna mapa wydań: `docs/07-roadmapa.md`, sekcja 2.
