# @crux/scheduling

Moduł terminarza i obłożenia foteli. W wydaniu 1.0 („Krasnodrzew”) tylko **obłożenie godzinowe** (F0-010, K11); wizyty od 1.1. Brak pól identyfikujących pacjenta. Architektura: `docs/01-architektura.md`, sekcja 4.

## Domena (`src/domain/chair-occupancy.ts`)

- `OccupancyEntry.create(input, clock, context)`: pełna godzina lokalna (`hourRange`), godziny otwarcia (poza nimi `occupancy.override_hours` + powód), blokady fotela, kategorie `Z1…Z5, Z+`, kwota ≥ 0 lub `null`, notatka ≤ 80 znaków bez PII.
- `OccupancyEntry.void(entry, reason, clock)`: powód wymagany.
- `DayClosure.close(...)`, `isDayClosed(...)`: podsumowanie `{ hours, amount_grosze, chairs_without_entries }`.
- Komunikaty błędów po polsku: `occupancyMessagePl(error.details.code)`.

## Przypadki użycia (`src/application/`)

Każdy: `(tx, actor, input, clock?)`, wejście walidowane Zod, komendy z `commandId` (idempotencja przez `platform.command_log`), `authorize(...)` ze scope gabinetu, zdarzenia przez `publishEvent`. Transakcję otwiera wywołujący (`withActor`).

| Przypadek użycia | Uprawnienie | Zdarzenie |
|---|---|---|
| `recordOccupancy`, `recordOccupancyRange` | `occupancy.write` / `occupancy.write_own` | `occupancy.entry_recorded.v1` |
| `voidOccupancy` | `occupancy.void` | `occupancy.entry_voided.v1` |
| `copyDayFrom` (bez kwot i notatek) | `occupancy.write` | `occupancy.entry_recorded.v1` |
| `closeDay` | `occupancy.close_day` | `occupancy.day_closed.v1` |
| `reopenDay` (powód) | `occupancy.write_closed` | `occupancy.day_reopened.v1` |
| `createTimeBlock`, `endTimeBlock` | `occupancy.write` | — |
| `getDayGrid`, `getWeekSummary`, `listOccupancy` | `occupancy.read` | — |

Reguły: zamknięty dzień wymaga `occupancy.write_closed` (AC5); tryb `scheduling.occupancy_mode = appointments` odrzuca ręczne wpisy (AC11); `getDayGrid` to jedno zapytanie SQL (AC10).

Wyniki to `Result<T, DomainError>`; kody walidacji w `details.code` (np. `chair_blocked`, `outside_opening_hours`).

## UI (`apps/web/app/(app)/oblozenie/`)

Wejście: `/oblozenie` (opcjonalnie `?dzien=YYYY-MM-DD`), za logowaniem/MFA i `AppShell`; gabinet = aktywny gabinet aktora.

- `page.tsx` (RSC): `requireActor` → `withActor` → `getDayGrid` (jedno zapytanie, AC10); przekazuje do klienta tylko dane bez PII (kwoty jako grosze-string).
- `occupancy-grid.tsx`: siatka fotele × godziny (czas lokalny), kategorie Z1–Z+, kwota, wskaźnik zamkniętego dnia, blokady, edytor wpisu/zakresu, anulowanie z powodem, „dzień jak…”, zamknij/otwórz dzień.
- `actions.ts` (server actions): `recordOccupancyAction`, `voidOccupancyAction`, `copyDayAction`, `closeDayAction`, `reopenDayAction` — `requireActor` + `withActor` + use-case; błędy mapowane na polskie komunikaty (`@crux/i18n`: `occupancyErrorMessage`).
- Teksty: `packages/i18n/src/pl/occupancy.ts`.
- Klawiatura (AC9): strzałki, `Enter` (edytor), `1`–`6` (szybki zapis kategorii), `Shift`+strzałka (zakres), `Backspace` (anulowanie wpisu), `Esc`.
- Pokryte AC w UI: 1, 2, 3, 5, 6, 7, 9, 11 (komunikaty z domeny), 10 (RSC). Widok tygodnia: `/oblozenie/tydzien` (`getWeekSummary` + `DotCalendar`). UI tworzenia blokad czasu jeszcze nie (use-case `createTimeBlock` gotowy).
- e2e: `apps/web/e2e/oblozenie.spec.ts` (`[F0-010/AC9]`, wymaga `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TOTP_CODE` i seedu).
- Wzorzec kopiowania: `docs/wzorzec-modulu.md`.

## Testy

`pnpm --filter @crux/scheduling test` — jednostkowe (domena, `FixedClock`, DST) i integracyjne (wymagają lokalnego Supabase: `pnpm db:start`).
