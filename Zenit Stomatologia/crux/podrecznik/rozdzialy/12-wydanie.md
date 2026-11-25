# 12 · Wdrożenie 1.0 i co po nim

## 12.1 Środowiska i co w nich żyje

| Środowisko | Gdzie | Dane | Jak trafia tam kod |
|---|---|---|---|
| lokalne | laptop: Supabase CLI w Dockerze, `pnpm dev`, worker lokalnie | fabryki, `pnpm seed:demo` | praca w Cursorze |
| podgląd PR | Vercel preview + gałąź Supabase | fabryki | automatycznie z PR |
| staging | Vercel `crux-staging`, Supabase `crux-staging` (Frankfurt), worker w kontenerze | syntetyczne o wolumenie produkcji | merge do `main` |
| produkcja | Vercel `crux` (`fra1`), Supabase `crux-prod` (Frankfurt, Pro + PITR), worker na serwerze w UE, Sentry UE | prawdziwe (personel, wpisy) | tag `v1.x.y` → CI → migracje → deploy, po 20:00 |

Adresy (ADR-033): produkcja `https://crux.zenitstomatologia.pl`, staging `https://crux-staging.zenitstomatologia.pl` (hasło Vercel), podglądy PR `*.vercel.app`. Domena główna `zenitstomatologia.pl` zostaje stroną dla pacjentów; Crux nie żyje pod ścieżką `/crux`, bo osobny host to osobne ciasteczka, osobna polityka CSP i osobny deploy. DNS: rekord CNAME `crux` → cel podany przez Vercel w zakładce Domains (dziś `cname.vercel-dns.com`), to samo dla `crux-staging`; `.com` → 301 na `.pl`.

Lista kontrolna projektu Supabase (`docs/ops/supabase-konfiguracja.md`, z K02): organizacja „Zenit Stomatologia”, region `eu-central-1`, Data API i Realtime wyłączone, MFA do panelu, osobne hasła ról `crux_app` i `crux_worker`, `pgaudit`, parametry logów bez treści zapytań, PITR, kopie.

## 12.2 Dane startowe produkcji (K17, skrypt `tools/bootstrap-prod.ts`)

1. Tenant: podmiot leczniczy z danych KRS/RPWDL (nazwa, NIP, REGON, numer księgi), DEK w KMS.
2. Gabinety: `01 Nowodworska` (baza), `02 Białowieska`: adres, kod resortowy, `color_key` (01, 02), `opened_on`.
3. Fotele i godziny otwarcia wg spisu z tygodnia 1 (tor C); wyjątki do końca roku (święta, dni skrócone).
4. Konta: `network_admin` (Miłosz, Bartek), `location_manager` i `receptionist` per gabinet, `dentist`/`hygienist` dla wykonawców z grafiku; hasła jednorazowe przekazane osobiście; MFA przy pierwszym logowaniu.
5. Ustawienia: `scheduling.occupancy_mode = manual` dla obu gabinetów; cele obłożenia (`analytics.targets.chair_utilization`): 01 → 0,75, 02 → 0,65 (do korekty po miesiącu).
6. Flagi: `oblozenie`, `pulpit`, `ustawienia`, `integracje` włączone; wszystko inne wyłączone.

Skrypt jest uruchamiany ręcznie, raz, z audytem; blokada, gdy `DATABASE_URL` nie wskazuje produkcji (i odwrotnie dla `seed:demo`).

## 12.3 Szkolenie i instrukcje

- `docs/instrukcje/recepcja-oblozenie.md` (1 strona ze zrzutami): logowanie i MFA, siatka dnia, klawisze, „dzień jak wczoraj”, kwoty, blokady, „zamknij dzień”, co robić przy pomyłce (unieważnij z powodem; po zamknięciu poproś kierownika).
- `docs/instrukcje/zarzad-pulpit.md` (1 strona): filtry, co znaczy każda liczba (link do definicji), drążenie, eksport, cele.
- Szkolenie 15 minut per gabinet w dniu wdrożenia; lista obecności w `docs/ops/`.
- Pierwsze 2 tygodnie: codzienny rzut oka na `days_closed_rate` i `dead` w outboxie; po 2 tygodniach retrospektywa z recepcją (co trwa za długo, czego brakuje) → backlog 1.1.

## 12.4 Lista kontrolna wdrożenia produkcyjnego (`docs/ops/wdrozenie-produkcyjne.md`)

- [ ] tag `v1.0.0` z zielonym CI; `pnpm doctor` zielony; `spec.traceability` pełne
- [ ] migracje przetestowane na stagingu z danymi o wolumenie produkcji; okno po 20:00
- [ ] kopia nocna działa; jedno odtworzenie wykonane na pustym kontenerze i opisane
- [ ] Sentry: testowy błąd na stagingu bez danych osobowych (zrzut w `docs/ops/`)
- [ ] `/healthz` workera monitorowany; `analytics.refresh` co 5 min widoczny w `refresh_log`
- [ ] dane startowe wgrane; konta utworzone; hasła jednorazowe przekazane osobiście
- [ ] instrukcje wydrukowane; szkolenie odbyte; lista obecności
- [ ] `CHANGELOG.md`: `1.0.0 · Krasnodrzew · 2026-12-11` (zakres, znane ograniczenia: brak pacjentów i wizyt, kwoty z wpisów ręcznych)
- [ ] wpis `1.0 · wydanie` w ledgerze

## 12.5 Bramka 1.0 i co ją może zatrzymać

Bramka (rozdział 2, `docs/07`, sekcja 2) jest mierzona po 10 dniach roboczych wpisów. Najczęstsze powody niespełnienia i odpowiedź:

| Objaw | Przyczyna | Odpowiedź |
|---|---|---|
| `days_closed_rate` < 90% | recepcja zapomina zamknąć dzień albo wpis trwa za długo | przypomnienie w pasku dnia o 19:00, skrót `Z`, retrospektywa; jeśli nie pomaga: zamknięcie dnia przez kierownika z listy dni |
| kafel przychodu niewiarygodny | kwoty wpisane w połowie godzin | pokazujemy odsetek godzin z kwotą; decyzja, kto wpisuje kwoty; od 2.0 źródłem są należności |
| `dead` w outboxie | handler analityki rzuca na danych brzegowych (zmiana czasu, blokada przez północ) | poprawka + test; zadanie w Integracjach do ponowienia |
| pulpit > 1,5 s | brak indeksu albo pełne przeliczenie w godzinach pracy | indeksy z `03a`, harmonogram nocny, cache 60 s |

## 12.6 Co po 1.0: warunki startu 1.1 „Ratania”

1. Bramka 1.0 spełniona (wpis w ledgerze `1.0 · bramka`).
2. Tor B zamknięty: opinia prawna (Supabase, dokumentacja), DPIA podpisana, umowy powierzenia (Supabase, Vercel, Hetzner, SMS, Sentry), rejestr czynności z czynnościami na danych pacjentów, procedury `docs/ops/` z właścicielami.
3. Specyfikacje F1-004…F1-011 napisane z szablonu (czaty w projekcie); spike terminarza (ADR-019) rozstrzygnięty.
4. Programista do przeglądu kodu dostępny.
5. Pierwsza migracja z danymi pacjentów (`patients`) ma etykietę `patient-data` i w PR potwierdzenie punktu 2.

Prompty 1.1: `prompts/F1-pacjenci-terminarz.md` (K01–K12). Obłożenie przechodzi na tryb `appointments` gabinet po gabinecie (rozdział 6.7), a pulpity dostają metryki wizyt bez zmiany układu.
