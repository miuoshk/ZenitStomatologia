-- Audyt 1.0 (2026-11-25) · `tests.reset_fixtures()` nie istnieje w bazach hostowanych.
--
-- Funkcja (security definer) robi TRUNCATE tabel domenowych i `audit.events`, a EXECUTE mieli
-- `authenticated`, `crux_app` i `crux_worker`. Na produkcji jeden błąd (zły DATABASE_URL przy
-- `seed:demo`, błąd w kodzie) czyściłby dane i log audytu, który ma być append-only.
--
-- Od teraz funkcja powstaje wyłącznie w `supabase/seed.sql`, który uruchamia tylko lokalny
-- `supabase start` / `supabase db reset` (CI, Vitest, pgTAP), a nigdy `supabase db push`.
-- Brak funkcji na produkcji dodatkowo blokuje `seed:demo` przeciw zdalnej bazie.

drop function if exists tests.reset_fixtures();
