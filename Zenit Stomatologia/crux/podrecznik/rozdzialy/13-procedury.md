# 13 · Procedury: jak dokładać, zmieniać i wracać

Każda procedura ma ten sam kształt: od czego zacząć, co jest niezmienne, czym się kończy. Źródło cyklu: `docs/10-praca-z-ai.md`, sekcja 2 i 3.

{{rysunek:cykl-funkcji}}

## 13.1 Jak dodać funkcję (od bólu w gabinecie do wydania)

1. **Ból → specyfikacja.** Czat w projekcie Claude z szablonem z `docs/10`, 3.1: problem, rozwiązanie w skrócie, historie, kryteria akceptacji w formie „Dane / Gdy / Wtedy”, dane (tabele z `03a`), uprawnienia (`docs/03`, 8), zdarzenia, prawo, UI, poza zakresem, otwarte pytania. Plik `docs/specs/<ID>.md`, wiersz w `docs/13`, pole „Wydanie”.
2. **Słownik i schemat najpierw.** Jeśli funkcja potrzebuje pojęcia, którego nie ma w `docs/03`, albo tabeli spoza `03a`: najpierw PR do dokumentacji (w tym samym dniu), potem kod. Model nie ma prawa wymyślać tabel.
3. **Prompt.** Czat w projekcie generuje prompt z szablonu `docs/10`, 3.2 na podstawie specyfikacji; prompt trafia do pliku fazy w `prompts/` (żeby ledger miał do czego się odwołać) jako kolejny `K`.
4. **Realizacja** częściami: migracja + RLS + pgTAP → domena + testy → przypadki użycia + testy integracyjne → ekran + e2e. Rytuał z rozdziału 10.3.
5. **Metryka?** Jeśli funkcja ma liczbę na pulpicie: 7.8.
6. **Wydanie.** Funkcja wchodzi do gabinetu z wydaniem, po bramce poprzedniego; `CHANGELOG.md`, instrukcja 1 strona, szkolenie.

## 13.2 Jak dodać tabelę lub kolumnę

1. Wpis w `docs/03a` (sekcja modułu) z komentarzem `rls:/append_only:/retention:` i w `docs/03` (słownik, niezmienniki).
2. Schemat Drizzle w `packages/db/src/schema/<moduł>.ts` z helperami `tenantColumns()`, `rls.*()`, `tableComment()`; `pnpm db:generate` → migracja; migracje na `main` nie są edytowane.
3. Zmiany niszczące tylko expand → migrate → contract z etykietą `destructive-migration`.
4. Test pgTAP izolacji tenantów i gabinetów (`supabase/tests/<tabela>.sql`); trigger audytu.
5. `pnpm db:test && pnpm doctor` (reguły `db.*`).

## 13.3 Jak dodać ekran

1. `pnpm gen screen <route>`: strona w `(app)`, komponent w `features/`, test e2e szkieletowy, teksty i18n.
2. Wyłącznie komponenty z `packages/ui` i tokeny; nowy komponent najpierw w `packages/ui` ze stroną w Storybooku.
3. Stany: ładowanie bez migania, pusto (krótki tekst + jedno działanie, rycina tylko w pustych stanach), błąd (co zrobić), brak uprawnień.
4. Klawiatura, 44 px na iPadzie, tryb ciemny, 768 px.
5. Lista kontrolna z `docs/14`, sekcja 11, i zrzuty w PR.

## 13.4 Jak dodać metrykę

Rozdział 7.8: `pnpm gen metric <id>` → definicja, SQL, `forma`, `goodDirection`, drążenie → `golden/expected.json` policzone niezależnie → wiersz w `docs/11` → kafel przez konfigurację.

## 13.5 Jak dodać gabinet, fotel, osobę (bez kodu)

- **Gabinet:** Ustawienia → Organizacja → nowy gabinet (numer `03`, nazwa, adres, kod resortowy, kolor z puli), fotele, godziny otwarcia; `scheduling.occupancy_mode = manual`; konta i członkostwa. Od tej chwili obłożenie i pulpity działają dla 03. Zero kodu (`docs/01`, sekcja 15).
- **Fotel:** Ustawienia → Organizacja → gabinet → fotele (nazwa, kolejność, wyposażenie). Pojemność liczy się od następnego odświeżenia.
- **Osoba:** Ustawienia → Personel → Zaproś (dane, tytuł, NPWZ, członkostwa z rolami); hasło jednorazowe przekazane osobiście; MFA przy pierwszym logowaniu.
- **Odejście:** Dezaktywuj (kończy członkostwa, wylogowuje, zostawia historię). Procedura `docs/ops/odejscie-pracownika.md`.

## 13.6 Jak zmienić zasadę (ADR)

1. Nowa decyzja na końcu `docs/02` według szablonu: status, kontekst, decyzja, konsekwencje, alternatywy, „wracamy, gdy”.
2. Stara decyzja nie jest kasowana: status „zastąpiona przez ADR-0XX” albo „uzupełniona przez”.
3. W tym samym PR: `AGENTS.md` i `.cursor/rules/*`, `pnpm doctor --update-lock` (reguły mają sumy kontrolne; zmiana bez locka jest ostrzeżeniem).
4. Jeśli decyzja zmienia schemat lub słownik: `03`, `03a` w tym samym PR; jeśli zmienia plan: `07` i podręcznik (`build.py`).

## 13.7 Jak wrócić (gdy coś poszło nie tak)

| Sytuacja | Procedura |
|---|---|
| wdrożenie zepsuło produkcję | Vercel: rollback do poprzedniego deploya (sekundy); worker: poprzedni obraz; baza: jeśli migracja była expand-only, nic nie robić; jeśli nie: PITR do minuty sprzed wdrożenia (`docs/ops/kopie-i-odtwarzanie.md`) i protokół w audycie |
| zły wpis w danych | nie kasujemy: unieważnienie z powodem (wpis), ponowne otwarcie dnia z powodem, korekta konfiguracji z audytem |
| prompt poszedł w złą stronę | odrzuć plan albo diff w czacie; nie poprawiaj ręcznie „po cichu”; zapisz w ledgerze, co odrzucono i dlaczego; jeśli to błąd dokumentacji, najpierw ADR |
| test czerwony „bez powodu” | nie osłabiaj testu; jeśli test jest zły, opisz dlaczego i poproś o decyzję (AGENTS, „Nigdy”) |
| `doctor` czerwony | poprawiasz kod, reguła zostaje; wyjątek tylko przez `tools/doctor/allowlist.json` z uzasadnieniem |
| utrata zaufania do liczby na pulpicie | drążenie: lista rekordów z sumą kontrolną; porównanie z `golden/verify.sql` na stagingu; jeśli definicja jest zła: zmiana w rejestrze + `docs/11` + nowy `since` |

## 13.8 Procedury operacyjne (`docs/ops/`, powstają w K16)

| Dokument | Kiedy | Właściciel |
|---|---|---|
| `incydent-bezpieczenstwa.md` | podejrzenie wycieku, utrata urządzenia, nietypowy dostęp; 72 h na ocenę zgłoszenia do UODO | zarząd |
| `korekta-wpisu.md` | każda korekta po zamknięciu dnia (1.0), wpisu klinicznego (3.0) | kierownik |
| `kopie-i-odtwarzanie.md` | kopie nocne, PITR, test odtworzenia co kwartał, RPO ≤ 5 min, RTO ≤ 4 h | Miłosz |
| `nowy-pracownik.md`, `odejscie-pracownika.md` | konta, członkostwa, MFA, tokeny, dostęp do dokumentów | kierownik + zarząd |
| `wdrozenie-produkcyjne.md` | okno po 20:00, lista kontrolna z 12.4 | Miłosz |
| `supabase-konfiguracja.md` | lista kontrolna projektu stagingowego i produkcyjnego | Miłosz |
| `zaleznosci-przeglad.md` | przegląd zależności i licencji co kwartał | Miłosz |

## 13.9 Rytm, który utrzymuje system w zdrowiu

- codziennie w pierwszych 2 tygodniach wydania: `days_closed_rate`, `dead` w outboxie, Sentry;
- co tydzień: przegląd ledgera, otwarte pytania z `docs/09`-stanu prac, backlog 1.1;
- co miesiąc: cele per gabinet, przegląd uprawnień (kto ma `network.view`), `pnpm audit`;
- co kwartał: test odtworzenia kopii, przegląd prawny (`docs/04` ma datę i właściciela), przegląd zależności, „bus factor”;
- przy każdym wydaniu: retrospektywa z recepcją, aktualizacja podręcznika (`build.py`), changelog.
