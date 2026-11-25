import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/identity",
    include: ["src/**/*.test.ts"],
  },
});
