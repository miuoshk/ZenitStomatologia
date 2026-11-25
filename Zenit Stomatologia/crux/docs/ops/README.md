# Dokumentacja operacyjna Crux (docs/ops)

**Właściciel:** Miłosz (administrator sieci) · **Data przeglądu:** 2026-11-25 · **Cel:** indeks procedur operacyjnych wydania 1.0 (K16). Każdy dokument ma właściciela i datę przeglądu; przegląd co 6 miesięcy lub po incydencie.

| Dokument | Po co | Właściciel |
|---|---|---|
| [incydent-bezpieczenstwa.md](incydent-bezpieczenstwa.md) | naruszenie ochrony danych: 72 h, role, szablon zgłoszenia do UODO | Miłosz |
| [korekta-wpisu.md](korekta-wpisu.md) | udokumentowana procedura korekty (§ 1 ust. 6 pkt 1 rozporządzenia) | Miłosz |
| [kopie-i-odtwarzanie.md](kopie-i-odtwarzanie.md) | PITR, `pg_dump`, kwartalny test odtworzenia, RPO/RTO | Bartek |
| [nowy-pracownik.md](nowy-pracownik.md) | konto, MFA, członkostwa | Miłosz |
| [odejscie-pracownika.md](odejscie-pracownika.md) | dezaktywacja, zakończenie członkostw, MFA, tokeny | Miłosz |
| [wdrozenie-produkcyjne.md](wdrozenie-produkcyjne.md) | okno po 20:00, lista kontrolna | Bartek |
| [supabase-konfiguracja.md](supabase-konfiguracja.md) | lista kontrolna Supabase (staging / produkcja) | Bartek |
| [zaleznosci-przeglad.md](zaleznosci-przeglad.md) | kwartalny przegląd zależności | Bartek |
| [sentry-bez-pii.md](sentry-bez-pii.md) | jak sprawdzić, że Sentry/OTel nie dostają danych osobowych | Bartek |

Obserwowalność (ADR-016): logi pino z allowlistą (`@crux/shared/logger`), Sentry UE bez PII, OpenTelemetry tylko z `OTEL_EXPORTER_OTLP_ENDPOINT`. Konfiguracja przez zmienne środowiskowe — patrz [sentry-bez-pii.md](sentry-bez-pii.md).
