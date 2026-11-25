# 10 · Plan wydania 1.0 krok po kroku

## 10.1 Siedemnaście kroków

Jeden prompt dziennie w dni robocze. Każdy krok ma w rozdziale 11 pełny tekst do wklejenia. Kolumna „Sprawdzenie” to komenda lub stan, który musi być zielony, zanim przejdziesz dalej.

| Krok | Co powstaje | Dni | Sprawdzenie | Zależy od |
|---|---|---|---|---|
| K01 | monorepo (pnpm + Turborepo), `apps/web` (Next.js 16), `apps/worker`, puste pakiety, CI, `docs/zaleznosci.md` | 1 | `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`; `docker build` obu aplikacji | — |
| K02 | Supabase lokalnie i staging, migracja bazowa (rozszerzenia, schematy, funkcje `auth.*`, role `crux_app`/`crux_worker`), pgTAP, lista kontrolna konfiguracji | 1 | `pnpm db:start && pnpm db:reset && pnpm db:test` | K01 |
| K03 | `@crux/shared`: `Result`, `Money`, `Id`, czas (`hourRange`), kryptografia za portem, `containsPii`, błędy | 1 | `pnpm test --filter @crux/shared`, pokrycie ≥ 90% | K01 |
| K04 | `@crux/db`: Drizzle, `withActor`, `withWorker`, helpery RLS, harness testów | 1 | `pnpm test --filter @crux/db`; `pnpm db:generate` bez różnic | K02, K03 |
| K05 | `@crux/platform`: audyt, log dostępu, outbox, `command_log`, flagi, ustawienia z rejestrem kluczy | 1 | `pnpm test --filter @crux/platform && pnpm db:test` | K04 |
| K06 | `@crux/identity` + `@crux/org`: personel, role, uprawnienia (macierz z `docs/03`, 8), członkostwa, tenant, gabinety, fotele, godziny | 1–2 | testy obu modułów, `pnpm db:test`, `pnpm doctor` | K05 |
| K07 | logowanie z MFA, sesja, blokada ekranu, powłoka ze znakiem Crux, `CommandPalette`, strona „O Crux” | 1–2 | `pnpm e2e`; `doctor` bez `service_role` | K06, K08 (komponenty) |
| K08 | `@crux/ui`: pakiet marki w repo, tokeny, komponenty, komplet wykresów, Storybook, testy wizualne | 2 | `storybook build`, `pnpm test:visual`, `pnpm lint` | K01 |
| K09 | `apps/worker`: pg-boss, dispatcher outboxa, harmonogramy, kopie nocne, `privileged.ts`, `/healthz` | 1 | `pnpm --filter worker test`; zdarzenie w outboxie kończy się `sent` | K05 |
| K10 | CI, `crux-doctor` (18 reguł), generatory (`gen module/usecase/screen/metric`), dependency-cruiser, szablon PR | 1 | `pnpm doctor` zielone; celowe naruszenie wykryte | K01–K09 |
| K11 | **obłożenie foteli** (F0-010) w 4 częściach: migracja i RLS, domena, przypadki użycia, ekran i e2e; `docs/wzorzec-modulu.md` | 3 | pełny zestaw; `spec.traceability` dla F0-010 | K06, K08, K10 |
| K12 | fabryki, zestaw wzorcowy (13 miesięcy wpisów), `pnpm seed:demo`, atrapy portów | 1 | `pnpm seed:demo`; `golden/verify.sql` = `expected.json` | K11 |
| K13 | `@crux/analytics` 1.0: wymiary i fakty, zasilanie co 5 min i nocne, rejestr metryk z 7 metrykami, `runMetric` | 2 | testy modułu, `pnpm db:test`, `pnpm doctor`; `refresh_log` po seedzie | K09, K12 |
| K14 | pulpity sieci/gabinetu/moje, `FilterBar`, lista drążenia, CSV (F0-011) | 2 | pełny zestaw; `spec.traceability` dla F0-011; p95 `/pulpit` < 1,5 s | K13 |
| K15 | ekrany administracji: organizacja, personel (zaproszenia), system (flagi, ustawienia, cele), Integracje (szkielet) | 1–2 | `pnpm e2e`, `pnpm doctor`, lista kontrolna UI | K06, K07 |
| K16 | obserwowalność bez danych osobowych (pino, Sentry UE, OTel), procedury `docs/ops/` | 1 | test loggera; zdarzenie w Sentry bez danych osobowych | K03 |
| K17 | **wydanie 1.0**: produkcja, dane startowe, konta, instrukcje, szkolenie, changelog, tag `v1.0.0` | 1 | bramka 1.0 po 10 dniach wpisów | wszystko |

Po K17: nowy czat z promptem przeglądu adwersarialnego (`docs/10`, 3.5) na całe repo; wpis `1.0 · bramka` w ledgerze.

## 10.2 Harmonogram

{{rysunek:harmonogram}}

| Tydzień | Tor A (kod) | Tor B (prawo) | Tor C (gabinety, dostawcy) |
|---|---|---|---|
| 1 (9–13.11) | K01, K02, K03, K04 | pytania do prawnika; wnioski o DPA (Supabase, Vercel, Sentry); organizacja Supabase | spis foteli i godzin 01 i 02; zapytania do Medfile, Docplanner, SMSAPI, Planmeca, biura rachunkowego |
| 2 (16–20.11) | K05, K06, K07, K08 (start) | rejestr czynności, szkic DPIA | dzień obserwacji w 01; lista osób i ról |
| 3 (23–27.11) | K08 (koniec), K09, K10, K11 (części 1–2) | szkice procedur ops | dzień obserwacji w 02; spis sprzętu |
| 4 (30.11–4.12) | K11 (części 3–4), K12, K13 | umowa między spółkami (szkic); token `--dane-kulka-pusta` | próbny eksport ze starego programu |
| 5 (7–11.12) | K14, K15, K16, K17 → **produkcja 11.12** | DPIA v1 | szkolenie recepcji; pierwszy dzień wpisów |
| 6 (14–18.12) | bufor, przegląd adwersarialny, poprawki | odpowiedzi prawnika → ADR | pomiar bazowy metryk ze starego programu |
| 7–10 (do 15.01) | specyfikacje 1.1, spike terminarza, F1 K01–K02 na gałęzi | DPIA podpisana, umowy powierzenia | plan importu; bramka 1.0 → retrospektywa |

Jeśli któryś krok trwa dłużej, przesuwa się wszystko za nim; nie skracamy kroku kosztem testów ani strażników. Bufor to tydzień 6.

## 10.3 Jak wykonać jeden krok (rytuał, zawsze ten sam)

1. **Nowy czat w Cursorze** dla każdego promptu. W pierwszej linii: `@AGENTS.md @prompts/ledger.md` plus pliki z sekcji „Przeczytaj” promptu. Reguły z `.cursor/rules/` ładują się same.
2. **Tryb Plan.** Wklej prompt. Cursor pokazuje plan plików. Czytasz 2 minuty: czy nie wychodzi poza „Zakres”, czy nie wymyśla tabel spoza `03a`, czy nie dodaje zależności spoza listy. Jeśli tak: odrzucasz i doprecyzowujesz w tym samym czacie.
3. **Tryb Agent** z tym samym promptem i dopiskiem „Realizuj plan”. Prompt z częściami (K11: 4 części) realizujesz część po części: każda część to osobny commit.
4. **Przegląd diffu.** Zasada z `docs/10`: nie akceptuj zmiany, której nie rozumiesz w 2 minuty; jeśli diff jest za duży, krok był za duży.
5. **Sprawdzenie.** Komendy z sekcji „Sprawdzenie” promptu muszą być zielone lokalnie, potem CI na PR.
6. **Przegląd adwersarialny** (drugi model, prompt 3.5 z `docs/10`) po każdym prompcie z etykietą `security`, `money`, `clinical` i po ostatniej części każdego modułu.
7. **Ledger.** Wpis w `prompts/ledger.md` (format w 10.4). To jest pamięć projektu między czatami.
8. **Commit** z Conventional Commits, PR z szablonem (definicja ukończenia, prompt, zrzuty ekranu przy UI), merge po zielonym CI.

Gdy Cursor zatrzyma się z pytaniem (prompty mówią mu, kiedy ma się zatrzymać: sekcja „Zatrzymaj się, gdy”): odpowiadasz w tym samym czacie i zapisujesz odpowiedź jako decyzję: ADR, jeśli dotyczy zasady; komentarz w specyfikacji, jeśli dotyczy funkcji.

## 10.4 Wpis w ledgerze

```
## 2026-11-26 · F0-010 · część 2 (domena)
Prompt: prompts/F0-fundament.md#K11 część 2
Commit: a1b2c3d · Gałąź: feat/F0-010-oblozenie
Wynik: zielone CI; doctor: 1 ostrzeżenie (brak README modułu) → poprawione w a1b2c3e
Uwagi: model chciał dodać pole `patient_initials` do chair_occupancy; odrzucone (ADR-032, nie ma w 03a).
```

Nowy czat czyta 10 ostatnich wpisów, zanim zaproponuje plan.

## 10.5 Definicja ukończenia (każda część i PR)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:db`, `pnpm doctor` przechodzą
- [ ] nowe tabele mają wpis w `03a`, RLS, komentarz, trigger audytu i test pgTAP
- [ ] kryteria akceptacji ze specyfikacji mają testy `[ID/ACn]` (doctor: `spec.traceability`)
- [ ] zdarzenia domenowe mają schemat i wersję; payload bez danych osobowych
- [ ] teksty interfejsu w `packages/i18n/pl`, ton zgodny z `docs/06`; lista kontrolna `docs/14`, sekcja 11, i zrzut ekranu w PR
- [ ] zależności wpisane w `docs/zaleznosci.md`
- [ ] wpis w `prompts/ledger.md`; ADR, jeśli zmieniła się zasada

## 10.6 Sygnały, że AI zaczyna rozwalać system (zatrzymaj się)

- nowa nazwa na istniejące pojęcie (`visit` obok `appointment`, `slot` jako tabela) → odrzuć, wskaż słownik;
- server action z logiką > 25 linii → przenieś do przypadku użycia;
- nowa tabela bez wpisu w `03a` i bez pgTAP → CI zawodzi;
- `service_role`, `security definer`, wyłączenie RLS, `using (true)` „żeby zadziałało” → stop;
- test zmieniony razem z kodem bez wyjaśnienia → odrzuć zmianę testu;
- zależność npm „przy okazji” → usuń lub uzasadnij w `docs/zaleznosci.md`;
- komponent z HEX albo wartością arbitralną Tailwinda → token;
- metryka na ekranie bez wpisu w rejestrze → rejestr najpierw;
- model „poprawia” dokumentację, żeby pasowała do kodu, bez ADR → cofnij.

Każdy taki przypadek kończy się dopisaniem zasady do `AGENTS.md`, reguły Cursora albo reguły `doctor`.
