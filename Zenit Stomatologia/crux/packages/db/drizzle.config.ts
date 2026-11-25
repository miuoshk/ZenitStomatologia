import { defineConfig } from "drizzle-kit";

/**
 * Generowanie migracji: `pnpm db:generate` (z katalogu pakietu lub root).
 * `out` = supabase/migrations — obok ręcznych `0001_…` / `manual_…`.
 * Prefiks `timestamp` — nie koliduje z numeracją K02.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "../../supabase/migrations",
  migrations: {
    prefix: "timestamp",
  },
  strict: true,
  verbose: true,
});
