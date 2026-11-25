# 9 · Stan prac na 6 listopada 2026

## 9.1 Co jest

| Element | Stan | Gdzie |
|---|---|---|
| Dokumentacja projektowa 2.1 | gotowa: wizja, architektura, 32 decyzje (ADR), model domeny, schemat bazy na poziomie DDL, prawo i bezpieczeństwo, integracje, design system, roadmapa z wydaniami, analiza rynku, konwencje kodu, praca z AI, dashboardy, obrazowanie, backlog, guideline aplikacji | `crux/docs/00–14` |
| Specyfikacje | 9 napisanych (F0-001, **F0-010, F0-011**, F1-001, F1-002, F1-003, F2-002, F3-001, F4-001); reszta w backlogu ze statusem `szkic` | `crux/docs/specs/`, `docs/13` |
| Prompty dla Cursora | 1.0: K01–K17 (ten podręcznik, rozdział 11); 1.1: F1 K01–K12; 2.0: F2 K01–K08; 2.1: F3 K01–K09; 3.0: F4 K00–K10; 4.0: F5 K01–K07 | `crux/prompts/` |
| Reguły Cursora | 9 plików `.mdc` (core, granice, baza, UI, bezpieczeństwo, kliniczne, integracje, analityka, testy) | `crux/.cursor/rules/` |
| Pakiet marki | brandbook zenit 1.0, księga znaku Crux 1.0, tokeny, fonty, logotypy, ikony, ryciny, geometria, komponenty wzorcowe, przykłady wykresów | `Materialy marki/`, `Crux - dla tworcow aplikacji/` |
| Makiety ekranów 1.0 | logowanie, obłożenie, pulpit sieci, personel, O Crux (dane przykładowe) | `crux/manifest/makiety/` |
| Manifest dla zespołu | 16 plansz PDF + źródło HTML | `crux/manifest/` |
| Plansze dla zespołu (prezentacja) | 16 slajdów w aplikacji Claude (wersja 13) | artefakt „Crux · plansze dla zespołu” |
| Prototyp pulpitu | HTML na danych przykładowych (sam układ) | `crux/design/crux-dashboard-prototyp.html` |

## 9.2 Czego nie ma (i kiedy będzie)

| Element | Kiedy | Kto |
|---|---|---|
| Repozytorium `crux` z kodem | K01 (tydzień 1) | Miłosz + Cursor |
| Organizacja Supabase „Zenit Stomatologia”, projekty `crux-staging` i `crux-prod` | K02 (staging), K17 (produkcja) | Miłosz |
| Konto Vercel i projekt, serwer workera w UE, Sentry UE | K17 | Miłosz |
| Spis foteli, godzin otwarcia i osób per gabinet | tydzień 1–2, tor C | Bartek + kierownicy |
| Opinia prawna, DPIA, umowy powierzenia | tor B, do 15.01.2027; warunek 1.1, nie 1.0 | Miłosz + prawnik |
| Odpowiedzi dostawców (Medfile, Docplanner, SMSAPI, Planmeca, biuro rachunkowe) | tor C, zapytania w tygodniu 1 | Miłosz |
| Programista do przeglądu kodu i integracji | od 1.1 | zarząd |

## 9.3 Decyzje otwarte (każda ma właściciela i termin)

| Pytanie | Propozycja | Decyduje | Do kiedy |
|---|---|---|---|
| Czy kwotę per godzinę wpisuje recepcja, czy wykonawca? | obie role mogą; kafel pokazuje odsetek godzin z kwotą | zarząd po dniu obserwacji | tydzień 3 |
| Cele obłożenia na start | 01 → 75%, 02 → 65%; korekta po miesiącu | zarząd | K17 |
| Czy sobota liczy się do dni roboczych w `days_closed_rate`? | tak, jeśli gabinet ma godziny otwarcia w sobotę | zarząd | K13 |
| Konto księgowości w 1.0? | nie, dopóki kwoty są z wpisów ręcznych | zarząd | K17 |
| Token `--dane-kulka-pusta` w pakiecie marki | dodać `#DCE4DD` / `#2A4A3A` do `tokens.css` w `Materialy marki/` | Miłosz | tydzień 4 |
| Czy gabinety 03 i 04 będą w tym samym podmiocie leczniczym? | model obsługuje oba warianty; decyzja wpływa na dane startowe tenanta | wspólnicy + prawnik | przed 1.1 |
| Która spółka jest operatorem systemu? | pytanie 1 do prawnika (`docs/04`, sekcja 8) | wspólnicy | tor B |

## 9.4 Czego potrzebuję od zespołu w pierwszych dwóch tygodniach

- od gabinetów 01 i 02: spis foteli (nazwy, kolejność, wyposażenie), godziny otwarcia per dzień tygodnia i znane wyjątki do końca roku, lista osób z rolami (kto jest recepcją, kierownikiem, wykonawcą w którym gabinecie), dzień obserwacji recepcji;
- od wspólników: zgoda na organizację Supabase i konta u dostawców (Supabase, Vercel, Sentry) na podmiot leczniczy; odpowiedź, kto podpisuje DPA; decyzja o operatorze systemu;
- od prawnika: 10 pytań z `docs/04`, sekcja 8, wysłane w tygodniu 1 (odpowiedzi warunkują 1.1).

## 9.5 Co się zmieniło 6 listopada (żeby nikt nie pracował na starej wersji)

- plan „F0 z modułem `lab` do 15 stycznia” zastąpiły **wydania**: 1.0 „Krasnodrzew” bez danych pacjentów do 11 grudnia, `lab` w 1.1 (ADR-032);
- modułem wzorcowym jest obłożenie foteli (F0-010); zlecenia laboratoryjne przeszły do 1.1;
- numeracja gabinetów: **01 Nowodworska, 02 Białowieska** (wcześniejsze dokumenty miały odwrotnie, poprawione wszędzie);
- prompty mają numery `K01`… (dawniej `P01`…); „P1” w dokumentach to wyłącznie Platforma P1;
- filtr wykonawcy w pulpitach nazywa się `wykonawca` (wcześniej `lekarz`), bo obejmuje higienistki;
- analityka, rejestr metryk, komplet wykresów i `FilterBar` powstają w 1.0 (wcześniej planowane dopiero w F3); F3 je rozszerza;
- Crux ma własny znak (księga znaku Crux 1.0) i pakiet marki jest źródłem tokenów (ADR-031).
