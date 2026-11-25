import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/db",
    include: ["src/**/*.test.ts"],
  },
});
