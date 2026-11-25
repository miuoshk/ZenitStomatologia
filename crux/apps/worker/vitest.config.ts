import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@crux/worker",
    include: ["src/**/*.test.ts"],
  },
});
