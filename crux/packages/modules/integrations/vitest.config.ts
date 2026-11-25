import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/integrations",
    include: ["src/**/*.test.ts"],
  },
});
