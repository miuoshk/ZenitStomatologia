# 09 · Konwencje kodu

Wersja 2.0 · 5 listopada 2026.

## 1. Struktura repo

```
crux/
  AGENTS.md
  README.md
  .cursor/rules/              # reguły dla Cursora (.mdc), także zagnieżdżone w packages/*
  apps/
    web/                      # Next.js 16
      app/
        (auth)/               # logowanie, MFA, blokada ekranu
        (app)/                # aplikacja po zalogowaniu
          dzis/ terminarz/ pacjenci/ plany/ finanse/ laboratorium/ recall/ pulpit/ integracje/ ustawienia/
        (public)/rezerwacja/
      features/<moduł>/       # komponenty i hooki konkretnej funkcji
      server/                 # server actions, requireActor, withActor, toActionResult
      proxy.ts                # sesja, blokada ekranu, nagłówki bezpieczeństwa
    worker/                   # Node: pg-boss, outbox, zadania cykliczne, importy, analityka
      src/privileged.ts       # jedyna lista operacji uprzywilejowanych
      src/migration/          # importy ze starego programu
    bridge/                   # (F5) lokalny agent Windows
  packages/
    modules/
      platform/ identity/ org/ patients/ scheduling/ messaging/ catalog/ planning/ billing/
      lab/ crm/ analytics/ clinical/ interop/ imaging/ integrations/ ai/
    db/                       # schemat Drizzle, klient, withActor, migracje, helpery RLS
    ui/                       # design system + Storybook; ui/brand/ = kopia 1:1 pakietu marki (tokeny, fonty, logo, ryciny; pnpm brand:sync), ui/src/charts/ = model kuleczkowy + wykresy, ui/src/documents/ = szablony PDF dla pacjenta (marka zenit)
    i18n/                     # teksty PL (klucze EN)
    shared/                   # Result, Money, Id, time, crypto, errors
    testing/                  # fabryki danych, helpery testów, atrapy portów, zestaw wzorcowy
    config/                   # eslint, tsconfig, tailwind preset, dependency-cruiser
  tools/
    doctor/                   # crux-doctor (pnpm doctor)
    gen/                      # generatory (pnpm gen)
  supabase/
    config.toml
    migrations/               # SQL (z drizzle-kit i ręczne)
    tests/                    # pgTAP
  docs/
  prompts/
  design/
```

## 2. Nazewnictwo

| Element | Konwencja | Przykład |
|---|---|---|
| pliki | kebab-case | `book-appointment.ts` |
| komponenty React | PascalCase, plik kebab-case | `DaySchedule` w `day-schedule.tsx` |
| przypadki użycia | czasownik + rzeczownik | `bookAppointment`, `acceptTreatmentPlan` |
| zapytania (odczyt) | `list…`, `get…`, `find…` | `listDaySchedule`, `findFreeSlots` |
| zdarzenia domenowe | `obiekt.czas_przeszły.vN` | `appointment.completed.v1` |
| uprawnienia | `obiekt.działanie` | `appointment.create`, `clinical_entry.sign` |
| tabele | snake_case, liczba mnoga | `lab_orders` |
| enumy w bazie | snake_case | `appointment_status` |
| ścieżki URL | po polsku, bez diakrytyków | `/terminarz`, `/pacjenci/[id]` |
| testy kryteriów | nazwa ze znacznikiem specyfikacji | `it('[F1-002/AC3] odrzuca kolizję na fotelu', …)` |
| gałęzie git | `feat/F1-012-lista-oczekujacych`, `fix/...`, `chore/...` | |
| commity | Conventional Commits po angielsku, zakres = moduł | `feat(scheduling): add waitlist` |
| etykiety PR | `security`, `destructive-migration`, `money`, `clinical`, `new-dependency`, `adr` | |

## 3. Wzorce kodu

**Przypadek użycia:**

```ts
// packages/modules/scheduling/src/application/book-appointment.ts
export const BookAppointmentInput = z.object({
  commandId: Id,
  patientId: Id, locationId: Id, chairId: Id, providerId: Id,
  start: z.coerce.date(), serviceIds: z.array(Id).min(1),
  overrideReason: z.string().min(3).optional(),
});

export async function bookAppointment(
  ctx: AppContext, actor: Actor, raw: unknown,
): Promise<Result<Appointment, BookingError>> {
  const input = BookAppointmentInput.parse(raw);
  await authorize(actor, 'appointment.create', { locationId: input.locationId });
  return ctx.db.withActor(actor, async (tx) => {
    const replay = await commandLog(tx).find(input.commandId);
    if (replay) return replay.result;
    const services = await catalog.servicesForBooking(tx, input.serviceIds);
    const draft = Appointment.draft({ ...input, durationMin: totalDuration(services), now: ctx.clock.now() });
    const rules = await schedulingRules(tx).check(draft, { allowOverride: !!input.overrideReason, actor });
    if (!rules.ok) return rules;                       // outside_working_hours | provider_unavailable | capability_missing
    const saved = await appointmentRepo(tx).insert(draft); // kolizja → unikalny błąd z EXCLUDE → mapowany na { type: 'conflict' }
    await outbox(tx).publish('appointment.booked.v1', { appointmentId: saved.id });
    await commandLog(tx).record(input.commandId, ok(saved));
    return ok(saved);
  });
}
```

**Server action (cienka, ≤ 25 linii, `crux-doctor` to sprawdza):**

```ts
'use server';
export async function bookAppointmentAction(formData: unknown) {
  const actor = await requireActor();
  const result = await bookAppointment(appContext, actor, formData);
  if (result.ok) updateTag(`schedule:${result.value.locationId}:${dayKey(result.value.start)}`);
  return toActionResult(result); // mapuje błędy domenowe na komunikaty z i18n
}
```

**Zasady:**
- Żadnego `any`. Żadnego `as` poza granicą systemu (parsowanie odpowiedzi zewnętrznych), z komentarzem.
- Daty: tylko `@crux/shared/time` (ADR-022). Nigdy `new Date()` w domenie i aplikacji; czas z `ctx.clock`.
- Pieniądze: tylko `Money` (`Money.fromPln('120.00')`, `money.add()`, `money.format()`), nigdy liczby zmiennoprzecinkowe.
- Błędy domenowe jako unie dyskryminowane (`{ type: 'conflict'; with: Id } | { type: 'outside_working_hours' }`), każdy typ ma tekst w i18n.
- Komendy przyjmują `commandId` (idempotencja).
- Importy między modułami tylko przez `@crux/<moduł>`; moduł eksportuje przypadki użycia, typy i zdarzenia, nigdy repozytoria.

## 4. Baza danych i migracje

- Schemat w `packages/db/src/schema/<moduł>.ts` wg `03a-schemat-bazy.md`. Moduł nie czyta tabel innego modułu bezpośrednio (wyjątek: widoki `analytics`).
- Każda zmiana schematu: `pnpm db:generate` → przegląd SQL → `pnpm db:test` (pgTAP) → PR. Migracje ręczne (funkcje, triggery, polityki złożone) jako pliki SQL w tym samym ciągu numeracji z prefiksem `manual_`.
- Expand → migrate → contract: nowa kolumna nullable → kod pisze do obu → przeniesienie danych → usunięcie starej w osobnym PR.
- Zakazane w jednej migracji: `DROP COLUMN`/`DROP TABLE`/zmiana typu na tabelach z danymi pacjentów bez etykiety `destructive-migration` i zgody właściciela.
- Każda tabela: komentarz `rls: <wzorzec>; append_only: yes|no; retention: <okres>`; polityki wg wzorców z `03a`, sekcja 0; tabele tylko do dopisywania bez polityk `update`/`delete` i z `revoke`.

Przykładowy test pgTAP (wzorzec dla każdej tabeli):

```sql
begin;
select plan(3);
select tests.authenticate_as('receptionist_tenant_a_loc_01');
select is_empty($$ select * from lab_orders where tenant_id = tests.tenant_b() $$, '[RLS] tenant A nie widzi zleceń tenanta B');
select throws_ok($$ insert into lab_orders (tenant_id, …) values (tests.tenant_b(), …) $$, '42501', null, '[RLS] tenant A nie zapisze do tenanta B');
select is_empty($$ select * from lab_orders where location_id = tests.location('02') $$, '[RLS] recepcja 01 nie widzi zleceń 02');
select * from finish();
rollback;
```

## 5. Testy

| Rodzaj | Narzędzie | Co testuje | Gdzie |
|---|---|---|---|
| jednostkowe | Vitest | reguły domeny, funkcje metryk, mapery FHIR | obok pliku (`*.test.ts`) |
| integracyjne | Vitest + lokalny Postgres (Supabase CLI) | przypadki użycia z bazą i RLS | `application/*.test.ts` |
| bazy | pgTAP | RLS, więzy, triggery audytu, append-only | `supabase/tests/` |
| kontraktowe | Vitest + nagrania | adaptery integracji na nagranych odpowiedziach | `integrations/src/contracts/` |
| architektury | dependency-cruiser, ESLint boundaries, `crux-doctor` | granice, konwencje, RLS, słownik | CI |
| e2e | Playwright | ścieżki krytyczne | `apps/web/e2e/` |
| wizualne | Storybook + zrzuty | komponenty `packages/ui` | `packages/ui` |
| wydajność | k6 lub Playwright trace na stagingu | budżety z `01`, sekcja 14 | `tools/perf/` |

Ścieżki krytyczne (e2e zawsze): logowanie z MFA, wyszukanie pacjenta, umówienie i przesunięcie wizyty, przeniesienie między gabinetami, rozliczenie wizyty z płatnością (F2), akceptacja planu (F2), podpisanie wpisu (F4), otwarcie w Romexis z atrapą agenta (F5).

Zestaw wzorcowy (`packages/testing/golden/`): deterministyczny tenant z 2 gabinetami (01: 3 fotele, 02: 2), 5 wykonawcami i 13 miesiącami wpisów obłożenia generowany z ziarna (1.0); od 1.1 także 200 pacjentów i wizyty, od 2.0 należności i plany; metryki mają oczekiwane wartości policzone niezależnie (`golden/verify.sql` + arkusz) i zapisane w `golden/expected.json`.

## 6. Granice modułów (lint + dependency-cruiser)

- `apps/*` importuje wyłącznie publiczne `index.ts` pakietów `@crux/*`.
- `domain/` nie importuje nic poza `@crux/shared` i własną domeną.
- `application/` importuje `domain`, porty i `@crux/db`.
- Moduł importuje inne moduły tylko wg strzałek z `01-architektura.md`, sekcja 4. Graf w `packages/config/dependency-cruiser.cjs` jest jedynym źródłem; `01` ma być z nim zgodny (doctor porównuje).

## 7. Narzędzia strażnicze (ADR-029)

- `pnpm gen module <name>`: tworzy `packages/modules/<name>` ze szkieletem, `README.md`, testem RLS, wpisem w dependency-cruiser i reguły Cursora `packages/modules/<name>/.cursor/rules/module.mdc` z opisem modułu.
- `pnpm gen usecase <module> <name>`: plik przypadku użycia + test integracyjny + wpis uprawnienia.
- `pnpm gen screen <route>`: strona w `(app)`, komponent w `features/`, test e2e szkieletowy, teksty i18n.
- `pnpm doctor`: reguły w `tools/doctor/rules/*.ts`, każda z opisem i poziomem (`error`/`warn`); raport w CI jako adnotacje PR. Reguły interfejsu: `ui.no-hex` (brak HEX poza `brand/`), `ui.brand-sync` (sumy kontrolne `brand/` zgodne z `brand/manifest.json`), `ui.brand-separation` (żadnego pliku `crux-*` ani `CruxLogo` w `packages/ui/src/documents/`, `packages/modules/messaging/` i `apps/web/app/(public)/`), `ui.metric-form` (karta wykresu używa formy z rejestru metryk).
- `pnpm brand:sync <ścieżka do Materialy marki>`: kopiuje tokeny, fonty, logotypy, ryciny, geometrię i przykłady wykresów do `packages/ui/brand/` i `packages/ui/src/{brand,charts}/`, zapisuje `brand/manifest.json`.
- `pnpm export:patient <id>`, `pnpm export:tenant`: eksport zgodny z § 1 ust. 6 pkt 8 (F4).

## 8. Przegląd zmian (PR)

- Mały PR: jedna funkcja lub jeden krok, do ok. 400 linii zmian bez wygenerowanych plików.
- Opis wg szablonu z `AGENTS.md` (definicja ukończenia) + sekcja „Prompty” z odnośnikiem do `prompts/ledger.md`.
- Etykiety wymagające przeglądu przez człowieka: `security`, `destructive-migration`, `money`, `clinical`, `new-dependency`, `adr`.
- Przegląd adwersarialny (drugi model, `10`, sekcja 3.5) obowiązkowy dla etykiet `security`, `money`, `clinical`.

## 9. Zależności

- Każda nowa zależność ma wpis w `docs/zaleznosci.md`: po co, alternatywy, licencja, czy przetwarza dane pacjentów, czy ma DPA. `crux-doctor` porównuje `package.json` z tym plikiem.
- Wersje przypięte (`pnpm` z `save-exact`), aktualizacje przez Dependabot raz w tygodniu, major po przeglądzie.
