# Bramka wydania 1.0 „Krasnodrzew”

**Właściciel:** Miłosz · **Data przeglądu:** 2026-11-25 · Źródło kryteriów: [docs/07, sekcja 2](../07-roadmapa.md), „Bramka 1.0 w całości”; scenariusze zatrzymania: podręcznik 12.5.

**Status bramki: oczekuje na 10 dni roboczych po go-live.** Planowane wdrożenie produkcyjne: 11.12.2026.

## Tag kodu a bramka operacyjna

- **Tag kodu `v1.0.0`** oznacza, że kod, testy i dokumentacja są kompletne (K01–K17 w repo). Nie oznacza, że wydanie jest wdrożone i zaakceptowane.
- **Bramka operacyjna** jest mierzona dopiero na produkcji, po 10 kolejnych dniach roboczych wpisów w obu gabinetach. Dopiero jej spełnienie uprawnia do wpisu `1.0 · bramka` w `prompts/ledger.md` i oznaczenia specyfikacji F0-010 i F0-011 jako „wdrożona”. Do tego czasu: „kod kompletny; wdrożona po bramce operacyjnej”.

## Lista kontrolna

| # | Kryterium | Dowód | Status |
|---|---|---|---|
| 1 | 10 kolejnych dni roboczych wpisów w obu gabinetach; `days_closed_rate ≥ 90%` w każdym | pulpit `/pulpit` (kafel „Dni zamknięte”), zrzut | oczekuje na 10 dni roboczych po go-live |
| 2 | Pulpit sieci zgodny z sumą wpisów (drążenie, `[F0-011/AC4]`); `refreshed_at` ≤ 10 min w godzinach pracy | zrzut drążenia z „zgodne z kafelkiem”; `analytics.refresh_log` | oczekuje na 10 dni roboczych po go-live |
| 3 | Wszystkie konta imienne z MFA; brak kont współdzielonych; kierownicy i recepcja przeszkoleni | lista kont w Ustawienia → Personel; [lista obecności](lista-obecnosci-szkolenie-1-0.md) | oczekuje (szkolenie w dniu go-live) |
| 4 | `pnpm doctor`, testy, e2e zielone na tagu `v1.0.0`; `spec.traceability` pełne dla F0-010 i F0-011 | CI na tagu | kod: do potwierdzenia w CI na tagu; reszta oczekuje |
| 5 | Kopie nocne działają; jedno odtworzenie wykonane i opisane; procedury `docs/ops/` mają właścicieli | wiersz w tabeli [kopie-i-odtwarzanie.md](kopie-i-odtwarzanie.md) | oczekuje na pierwszą produkcyjną kopię i test odtworzenia |
| 6 | Zero zdarzeń `dead` w outboxie przez 10 dni; Sentry bez danych osobowych (zrzut w `docs/ops/`) | zapytanie o outbox, zrzut z Sentry ([sentry-bez-pii.md](sentry-bez-pii.md)) | oczekuje na 10 dni roboczych po go-live |
| 7 | Retrospektywa z recepcją po 2 tygodniach: czas wpisania dnia ≤ 3 minuty; lista bólów do 1.1 | notatka z retrospektywy | oczekuje na 2 tygodnie po go-live |

## Dziennik pierwszych 10 dni (codzienny przegląd)

| Dzień roboczy | Data | `days_closed_rate` 01 | `days_closed_rate` 02 | `dead` w outboxie | Uwagi |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

Decyzja o zamknięciu bramki: ____________ (data, osoba). Po zamknięciu: wpis `1.0 · bramka` w ledgerze i zmiana statusu F0-010/F0-011.
