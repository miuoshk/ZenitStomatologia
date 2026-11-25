import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/analytics",
    include: ["src/**/*.test.ts"],
  },
});
