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
    command: `pnpm exec next dev --turbopack --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
