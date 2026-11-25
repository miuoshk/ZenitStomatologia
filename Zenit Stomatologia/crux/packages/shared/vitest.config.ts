import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/shared",
    include: ["src/**/*.test.ts"],
  },
});
