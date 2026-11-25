import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/shared",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/money.ts", "src/pesel.ts", "src/crypto.ts", "src/pii.ts"],
      // Prompt K03: ≥90% dla money/pesel/crypto/pii (linie/instrukcje).
      // Branches niżej — dużo ścieżek obronnych (parse errors).
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 70,
      },
    },
  },
});
