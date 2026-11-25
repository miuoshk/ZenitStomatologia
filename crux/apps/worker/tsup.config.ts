import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node22",
  // Pakiety workspace w bundlu; natywne/CJS zostają external.
  noExternal: [/^@crux\//],
  external: ["pg-boss", "pino", "pino-pretty", "postgres", "drizzle-orm", "zod"],
});
