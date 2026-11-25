import { defineConfig, devices } from "@playwright/test";

const PORT = "3000";
const baseURL = `http://127.0.0.1:${PORT}`;
const isCi = process.env["CI"] === "true" || process.env["CI"] === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    env: {
      ...process.env,
      // Public local Supabase demo keys (docs) — override via real .env when present.
      SUPABASE_URL: process.env["SUPABASE_URL"] ?? "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY:
        process.env["SUPABASE_PUBLISHABLE_KEY"] ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      DATABASE_URL:
        process.env["DATABASE_URL"] ??
        "postgresql://crux_app:crux_app_local_only@127.0.0.1:54322/postgres",
      CRUX_IDLE_LOCK_MS: process.env["CRUX_IDLE_LOCK_MS"] ?? "500",
    },
  },
});
