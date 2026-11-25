# Incydent bezpieczeństwa / naruszenie ochrony danych

**Właściciel:** Miłosz (administrator sieci; zastępca: Bartek) · **Data przeglądu:** 2026-11-25 · **Cel:** co zrobić w pierwszych godzinach po podejrzeniu naruszenia, tak by zmieścić się w **72 h** na zgłoszenie do UODO (RODO art. 33) i poinformować osoby, gdy ryzyko jest wysokie (art. 34).

> Wydanie 1.0 nie przetwarza danych pacjentów (ADR-032). Dane osobowe w systemie to dane personelu (konta, role, grafik). Procedura obowiązuje od pierwszego dnia, bo będzie obowiązywać od 1.1.

## Role

| Rola | Kto | Zadanie |
|---|---|---|
| Kierujący incydentem | Miłosz | decyzje, kontakt z UODO i prawnikiem, dziennik |
| Technik | Bartek | izolacja, logi, przywrócenie, dowody |
| Inspektor ochrony danych / prawnik | wg umowy | ocena ryzyka, treść zgłoszenia |
| Kierownik gabinetu | per gabinet | komunikacja z personelem, zgłoszenia od recepcji |

## Oś czasu

1. **0–1 h — wykrycie i izolacja.** Zapisz czas wykrycia (to jest „t0” dla 72 h). Wyłącz podejrzane konto (`/ustawienia/personel` → Dezaktywuj), unieważnij sesje, w razie wycieku klucza: rotacja (KMS, hasła ról `crux_app`/`crux_worker`, klucze Supabase).
2. **1–8 h — zabezpieczenie dowodów.** Nie kasuj logów. Zrzuć `audit.events` i `audit.access_log` dla okresu, logi workera (pino, bez PII), zdarzenia Sentry (po `request_id`), logi Supabase. Zanotuj kto/co/kiedy.
3. **8–24 h — ocena.** Jakie dane, ilu osób, czy zaszyfrowane, czy ryzyko dla osób (niskie / wysokie). Decyzja: zgłaszać czy nie (każdą decyzję uzasadnij na piśmie — art. 33 ust. 5).
4. **≤ 72 h od t0 — zgłoszenie do UODO** (formularz na uodo.gov.pl), jeśli naruszenie może skutkować ryzykiem. Gdy brakuje informacji, zgłoś etapami.
5. **Bez zbędnej zwłoki — zawiadomienie osób**, gdy ryzyko wysokie (art. 34).
6. **Po incydencie** — wpis w rejestrze naruszeń, post-mortem w ciągu 7 dni, zmiany w kodzie/dokumentacji (ADR, `prompts/ledger.md`).

## Szablon zgłoszenia do UODO

```
Administrator: <nazwa podmiotu leczniczego, adres, NIP, dane kontaktowe IOD>
Data i godzina wykrycia (t0): <...>
Data i godzina naruszenia (jeśli znana): <...>
Charakter naruszenia: ☐ poufność ☐ integralność ☐ dostępność
Opis zdarzenia: <fakty, bez danych osobowych w treści>
Kategorie i przybliżona liczba osób: <...>
Kategorie i przybliżona liczba rekordów: <...>
Możliwe skutki: <...>
Podjęte i planowane środki zaradcze: <...>
Czy osoby zostały / zostaną zawiadomione: <tak/nie, termin, uzasadnienie>
Osoba kontaktowa: <imię, e-mail, telefon>
Przetwarzający zaangażowani (Supabase, Vercel, Sentry…): <...>
```

## Rejestr naruszeń (wpis)

`data | t0 | opis | kategorie danych | liczba osób | zgłoszono UODO (tak/nie, data) | zawiadomiono osoby | środki | zamknięto`

## Kontakty

Uzupełnić przed wydaniem 1.0 (K17): IOD/prawnik, UODO (infolinia), wsparcie Supabase, Vercel, Sentry.
