import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/scheduling",
    include: ["src/**/*.test.ts"],
  },
});
