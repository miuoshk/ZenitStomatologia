import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/org",
    include: ["src/**/*.test.ts"],
  },
});
