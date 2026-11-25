import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/platform",
    include: ["src/**/*.test.ts"],
  },
});
