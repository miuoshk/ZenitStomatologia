import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/testing",
    include: ["src/**/*.test.ts"],
  },
});
