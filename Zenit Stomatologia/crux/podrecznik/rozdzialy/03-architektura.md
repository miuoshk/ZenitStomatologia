# 3 · Architektura w obrazkach

Pełny opis: `docs/01-architektura.md`; uzasadnienia: `docs/02-decyzje-architektoniczne.md` (ADR-001…033). Ten rozdział pokazuje to samo rysunkami i tłumaczy, co każda decyzja chroni.

## 3.1 Styl: modularny monolit

Jedna aplikacja webowa (Next.js 16), jeden proces roboczy (worker w Node) i jedna baza (PostgreSQL w Supabase) korzystają z tych samych modułów domenowych w jednym repozytorium. Moduł to osobny pakiet (`packages/modules/<nazwa>`) z trzema warstwami: `domain` (czyste reguły, zero I/O), `application` (przypadki użycia: komendy i zapytania), `infrastructure` (repozytoria Drizzle, adaptery). Moduły rozmawiają ze sobą tylko przez publiczny `index.ts` i zdarzenia domenowe.

**Dlaczego nie mikroserwisy:** zespół to jedna osoba plus AI. Mikroserwisy mnożą miejsca, w których model może rozjechać kontrakt. Monolit z twardymi granicami (lint, `dependency-cruiser`, `crux-doctor`) daje tę samą izolację i kosztuje dziesięć razy mniej. Granice są narysowane tak, że analitykę albo obrazowanie da się kiedyś wyciąć bez przepisywania reszty.

## 3.2 Kontekst systemu w wydaniu 1.0

{{rysunek:kontekst}}

W 1.0 nie ma pacjenta, Platformy P1, SMS-ów ani ZnanyLekarz. Stary program gabinetowy zostaje nietknięty; Crux stoi obok i mierzy. Integracje zewnętrzne mają już porty i atrapy, żeby 1.1 tylko podpinało adaptery.

## 3.3 Kontenery i środowiska

{{rysunek:kontenery}}

| Środowisko | Baza | Dane | Kto |
|---|---|---|---|
| lokalne | Supabase CLI (Docker na laptopie) | fabryki, `pnpm seed:demo` | Miłosz, Cursor |
| podgląd (PR) | gałąź Supabase | fabryki | automatycznie z PR |
| staging | projekt `crux-staging`, Frankfurt | syntetyczne, wolumen jak produkcja | testy akceptacyjne z recepcją |
| produkcja | projekt `crux-prod`, Frankfurt, PITR | prawdziwe (personel, wpisy obłożenia) | gabinety |

Koszt infrastruktury 1.0: ok. 1 000–1 500 zł miesięcznie (Supabase Pro + PITR, Vercel Pro, serwer workera w UE, Sentry). Szczegóły: `docs/01`, sekcja 13.

## 3.4 Moduły w 1.0 i kierunki zależności

{{rysunek:moduly}}

| Moduł | Pakiet | W 1.0 odpowiada za | Prompt |
|---|---|---|---|
| Platforma | `@crux/platform` | audyt, log dostępu, outbox, `command_log`, flagi, ustawienia (w tym `scheduling.occupancy_mode`) | K05 |
| Tożsamość | `@crux/identity` | personel, role, uprawnienia jako dane, członkostwa, `authorize()`, claims, konta | K06 |
| Organizacja | `@crux/org` | tenant (podmiot leczniczy), gabinety, fotele, godziny otwarcia, wyjątki | K06 |
| Terminarz (część 1.0) | `@crux/scheduling` | obłożenie foteli: wpisy, blokady foteli, zamknięcie dnia; **moduł wzorcowy** | K11 |
| Analityka (część 1.0) | `@crux/analytics` | schemat `analytics`, zasilanie, rejestr metryk, `runMetric` | K13 |
| Integracje | `@crux/integrations` | porty i atrapy (SMS, pliki, KMS); adaptery od 1.1 | K09, K12 |
| Współdzielone | `@crux/shared`, `@crux/db`, `@crux/ui`, `@crux/i18n`, `@crux/testing` | typy wartości, dostęp do bazy, design system, teksty, fabryki | K03, K04, K08, K12 |

Strzałka „A → B” znaczy „A może importować z B”. Reszta jest zabroniona i egzekwowana lintem i `dependency-cruiser`. Reakcja modułu „niżej” na coś z modułu „wyżej” idzie wyłącznie przez zdarzenie domenowe w outboxie (np. `occupancy.day_closed.v1` → worker → odświeżenie analityki).

## 3.5 Budowa jednego modułu (szablon, który generuje `pnpm gen module`)

```
packages/modules/scheduling/
  src/
    domain/                     # typy, encje, reguły; zero I/O; czas z ctx.clock
      chair-occupancy.ts
      chair-occupancy.rules.test.ts
      day-closure.ts
    application/                # przypadki użycia: komendy i zapytania
      record-occupancy.ts
      record-occupancy.test.ts  # integracyjny, z bazą testową i RLS
      close-day.ts
      get-day-grid.ts
    infrastructure/             # repozytoria (Drizzle), mapowanie wierszy na domenę
      occupancy.repository.ts
      day-grid.read-model.ts
    events.ts                   # zdarzenia publikowane przez moduł (typy + schematy Zod)
    permissions.ts              # uprawnienia definiowane przez moduł
    index.ts                    # JEDYNY publiczny interfejs modułu
  package.json                  # name: @crux/scheduling
  README.md                     # 10 linii: co moduł robi, czego nie robi, od czego zależy
```

Ekrany żyją w `apps/web/app/(app)/…`, komponenty specyficzne dla funkcji w `apps/web/features/<moduł>/`, komponenty ogólne w `packages/ui`.

## 3.6 Przepływ jednej komendy (co się dzieje po „Zapisz”)

{{rysunek:przeplyw-komendy}}

Zasady, które ten rysunek egzekwuje:

- przypadek użycia zwraca `Result<T, DomainError>`; wyjątki tylko dla awarii technicznych;
- jedna komenda = jedna transakcja; zdarzenie zapisuje się do outboxa w tej samej transakcji, więc nie istnieje stan „wpis zapisany, analityka o tym nie wie”;
- idempotencja: komenda ma `commandId` z klienta; powtórka (podwójne kliknięcie, utrata łączności) zwraca pierwotny wynik (`platform.command_log`);
- server action ma ≤ 25 linii: waliduje (Zod), woła przypadek użycia, zwraca wynik; logika nie żyje w Next.js.

## 3.7 Obrona w głąb: dlaczego baza sama pilnuje dostępu

{{rysunek:rls}}

1. **Aplikacja:** `authorize(actor, permission, scope)` w każdym przypadku użycia sprawdza uprawnienie i członkostwo w gabinecie. Uprawnienia są danymi (`identity.permissions`, `role_permissions`) sprawdzanymi w jednym miejscu.
2. **Baza:** RLS (row level security) na każdej tabeli. Serwer łączy się jako `crux_app` i w każdej transakcji ustawia `set local role authenticated` oraz claims (`request.jwt.claims`: kto, który tenant, które gabinety, jakie uprawnienia). Polityki porównują `tenant_id` i `location_id` z claimami. Nawet jeśli AI zapomni o `where location_id = …`, baza nie odda cudzych wierszy.
3. **Brak bocznych drzwi:** Data API Supabase wyłączone (ADR-020); klucz workera ma osobną rolę `crux_worker` z listą dozwolonych operacji (`apps/worker/src/privileged.ts`) i własnym audytem; żadnego `service_role` w kodzie.
4. **Test:** każda tabela ma test pgTAP „użytkownik tenanta A nie widzi i nie zmieni wiersza tenanta B” oraz „użytkownik gabinetu 01 bez członkostwa w 02 nie widzi wiersza z 02”.

## 3.8 Zdarzenia, outbox i worker

- `platform.outbox`: wiersz na zdarzenie (`topic`, `payload` z samymi identyfikatorami, `status`, `attempts`, `dedupe_key`). Adapter dociąga dane w chwili wysyłki.
- Worker (pg-boss) co 5 s pobiera `pending`, wykonuje handler, ponawia z wykładniczym odstępem, po 8 próbach oznacza `dead` i tworzy zadanie dla człowieka na ekranie Integracje.
- Zadania cykliczne w 1.0: `analytics.refresh` (co 5 min i pełne 02:10), `backup.nightly` (02:00), `integrity.verify` (03:00).
- Zdarzenia mają schemat Zod i wersję (`occupancy.day_closed.v1`); zmiana kształtu = nowa wersja, stare konsumenty działają.

## 3.9 Analityka jako osobny schemat

{{rysunek:analityka}}

Pulpity nie liczą nic z tabel operacyjnych. Czytają ze schematu `analytics` (fakty i wymiary), który worker odświeża co 5 minut. Każda metryka ma: definicję słowną, SQL w `@crux/analytics/metrics/<id>.ts`, test na zestawie wzorcowym, wpis w rejestrze (`docs/11`) i drążenie do listy rekordów. Dlaczego osobno: żeby ekran dnia nie zwalniał od zapytań zarządu, żeby definicje były w jednym miejscu i żeby w 2.1 dołożyć fakty wizyt i należności bez przebudowy.

## 3.10 Strażnicy: jak system rośnie przez prompty i się nie psuje

| Strażnik | Co łapie | Gdzie |
|---|---|---|
| `pnpm gen` | tworzy szkielet modułu, przypadku użycia, ekranu, metryki, żeby AI nie wymyślało struktury | `tools/gen` |
| TypeScript strict + ESLint boundaries | import z wnętrza cudzego modułu, `any`, `new Date()` poza `shared/time` | `packages/config` |
| `dependency-cruiser` | zależność między modułami spoza grafu z `docs/01` | `packages/config/dependency-cruiser.cjs` |
| pgTAP | tabela bez RLS, wyciek między tenantami i gabinetami, aktualizacja tabeli tylko do dopisywania | `supabase/tests` |
| `crux-doctor` | tabela bez wpisu w `03a`, server action > 25 linii, `service_role`, HEX poza tokenami, metryka bez rejestru, forma wykresu niezgodna z rejestrem, spec bez testów `[ID/ACn]`, zmiana reguł bez aktualizacji locka | `tools/doctor` |
| znaczniki `[ID/ACn]` | każde kryterium akceptacji ma test | testy |
| `prompts/ledger.md` | pamięć projektu między czatami: co zrobiono, co odrzucono, jaki dług | `prompts/` |
| przegląd adwersarialny | drugi model szuka dziur po każdym prompcie `security`, `money`, `clinical` | `docs/10`, 3.5 |

## 3.11 Decyzje, które chronią 1.0 (z ADR)

| ADR | Decyzja | Przed czym chroni |
|---|---|---|
| 001, 002 | modularny monolit, TypeScript wszędzie | rozjazd kontraktów między usługami; dwa języki w jednym zespole |
| 004, 020 | Supabase we Frankfurcie, Data API wyłączone, plan wyjścia | transfer danych poza UE; dostęp do bazy z pominięciem RLS |
| 005 | Drizzle + RLS przez claims w transakcji | zapytanie bez `where tenant_id` |
| 007 | UUIDv7, grosze jako `bigint`, `timestamptz`, `tstzrange` z więzem wykluczającym | kolizje identyfikatorów, błędy zaokrągleń, nakładające się wpisy na fotelu |
| 008 | dokumentacja i finanse tylko dopisywane | „kto to zmienił i dlaczego” bez odpowiedzi |
| 009 | outbox + pg-boss | zgubione zdarzenie, blokada recepcji przez awarię integracji |
| 014, 031 | własny design system z pakietu marki, model kuleczkowy | wygląd „jak każdy SaaS”; kolory spoza tokenów |
| 027 | schemat `analytics` i metryki jako kod | liczby liczone ad hoc w ekranach, bez testu i definicji |
| 029 | generator, doctor, granice modułów | AI rozjeżdżające architekturę krok po kroku |
| 030 | Next.js 16 bez Cache Components do 2.1 | wyciek danych między użytkownikami przez cache |
| 032 | wydania; 1.0 bez danych pacjentów; obłożenie jako wzorzec | czekanie na prawników z wartością dla gabinetów |
