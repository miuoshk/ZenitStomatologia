import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/i18n",
    include: ["src/**/*.test.ts"],
  },
});
