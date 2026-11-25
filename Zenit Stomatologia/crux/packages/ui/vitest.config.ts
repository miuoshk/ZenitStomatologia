import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/ui",
    include: ["src/**/*.test.ts"],
  },
});
