#!/usr/bin/env node
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    printHelp();
    process.exit(0);
  }

  switch (cmd) {
    case "module":
      await genModule(rest[0]);
      break;
    case "usecase":
      await genUsecase(rest[0], rest[1]);
      break;
    case "screen":
      await genScreen(rest[0]);
      break;
    case "metric":
      await genMetric(rest[0]);
      break;
    default:
      console.error(`Nieznana komenda: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`pnpm gen <command>

  module <name>           szkielet packages/modules/<name>
  usecase <module> <name> application/<name>.ts + test
  screen <route>          apps/web/app/(app)/<route>/page.tsx
  metric <id>             analytics/src/metrics/<id>.ts + test + wiersz docs/11
`);
}

async function genModule(name: string | undefined): Promise<void> {
  if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error("module: podaj nazwę snake/kebab lowercase, np. scheduling");
  }
  const dir = path.join(repoRoot, "packages/modules", name);
  const src = path.join(dir, "src");
  await mkdir(path.join(src, "domain"), { recursive: true });
  await mkdir(path.join(src, "application"), { recursive: true });
  await mkdir(path.join(src, "infrastructure"), { recursive: true });

  const pkg = {
    name: `@crux/${name}`,
    version: "0.0.0",
    private: true,
    type: "module",
    exports: { ".": "./src/index.ts" },
    scripts: {
      typecheck: "tsc --noEmit -p tsconfig.json",
      lint: "eslint . --max-warnings 0",
      test: "vitest run --passWithNoTests",
      build: "tsc -p tsconfig.build.json",
    },
    dependencies: {
      "@crux/db": "workspace:*",
      "@crux/shared": "workspace:*",
      "@crux/platform": "workspace:*",
      "@crux/identity": "workspace:*",
    },
    devDependencies: {
      "@types/node": "22.20.7",
      typescript: "6.0.3",
      vitest: "5.1.2",
    },
  };

  await writeIfAbsent(path.join(dir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  await writeIfAbsent(
    path.join(dir, "tsconfig.json"),
    `{
  "extends": "../../config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
`,
  );
  await writeIfAbsent(
    path.join(dir, "tsconfig.build.json"),
    `{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "declaration": true },
  "exclude": ["src/**/*.test.ts"]
}
`,
  );
  await writeIfAbsent(
    path.join(src, "index.ts"),
    `/** @crux/${name} — publiczny interfejs modułu. */\nexport {};\n`,
  );
  await writeIfAbsent(
    path.join(src, "permissions.ts"),
    `/** Uprawnienia modułu @crux/${name}. */\nexport const permissions = [] as const;\n`,
  );
  await writeIfAbsent(
    path.join(src, "events.ts"),
    `/** Zdarzenia publikowane przez @crux/${name} (schematy Zod w K11+). */\nexport const eventSchemas = {} as const;\nexport type ${pascal(name)}Event = keyof typeof eventSchemas;\n`,
  );
  await writeIfAbsent(
    path.join(dir, "README.md"),
    `# @crux/${name}\n\nCo robi: (uzupełnij).\nCzego nie robi: (uzupełnij).\nZależy od: platform, identity.\n`,
  );
  await writeIfAbsent(
    path.join(dir, ".cursor/rules/module.mdc"),
    `---\ndescription: Reguły modułu @crux/${name}\nglobs: packages/modules/${name}/**\n---\n\n- Importuj tylko przez \`@crux/${name}\`.\n- Każdy usecase z \`Actor\` woła \`authorize(\`.\n`,
  );
  await writeIfAbsent(
    path.join(repoRoot, "supabase/tests", `${name}_rls.sql`),
    `-- pgTAP szablon RLS dla @crux/${name}\n-- begin;\n-- select plan(1);\n-- select pass('TODO: RLS ${name}');\n-- select * from finish();\n-- rollback;\n`,
  );

  await ensureDepcruiserStub(name);
  console.log(`OK module @crux/${name} → packages/modules/${name}`);
}

async function genUsecase(moduleName: string | undefined, name: string | undefined): Promise<void> {
  if (!moduleName || !name) throw new Error("usecase: pnpm gen usecase <module> <name>");
  const file = path.join(
    repoRoot,
    "packages/modules",
    moduleName,
    "src/application",
    `${kebab(name)}.ts`,
  );
  const test = file.replace(/\.ts$/, ".test.ts");
  await mkdir(path.dirname(file), { recursive: true });
  const fn = camel(name);
  await writeIfAbsent(
    file,
    `import type { Actor, Tx } from "@crux/db";
import { authorize } from "@crux/identity";
import { ok, type DomainError, type Result } from "@crux/shared/result";

export async function ${fn}(
  tx: Tx,
  actor: Actor,
  _input: Record<string, unknown>,
): Promise<Result<true, DomainError>> {
  const auth = await authorize(tx, actor, "TODO.permission");
  if (!auth.ok) return auth;
  return ok(true);
}
`,
  );
  await writeIfAbsent(
    test,
    `import { describe, expect, it } from "vitest";\n\ndescribe("${fn}", () => {\n  it("placeholder", () => {\n    expect(true).toBe(true);\n  });\n});\n`,
  );
  console.log(`OK usecase ${moduleName}/${fn}`);
}

async function genScreen(route: string | undefined): Promise<void> {
  if (!route) throw new Error("screen: pnpm gen screen <route>");
  const dir = path.join(repoRoot, "apps/web/app/(app)", route);
  await mkdir(dir, { recursive: true });
  await writeIfAbsent(
    path.join(dir, "page.tsx"),
    `export default function Page() {\n  return <main><h1>${route}</h1></main>;\n}\n`,
  );
  console.log(`OK screen /(app)/${route}`);
}

async function genMetric(id: string | undefined): Promise<void> {
  if (!id || !/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new Error("metric: pnpm gen metric <id> (np. chair_utilization)");
  }
  const dir = path.join(repoRoot, "packages/modules/analytics/src/metrics");
  await mkdir(dir, { recursive: true });
  await writeIfAbsent(
    path.join(dir, `${id}.ts`),
    `/** Metryka ${id} — szkielet (K13). */\nexport const metric = {\n  id: "${id}",\n  name: "${id}",\n  definition: "TODO",\n  since: "1.0",\n  forma: "number",\n  grain: ["day"] as const,\n  permission: "analytics.view_location",\n} as const;\n`,
  );
  await writeIfAbsent(
    path.join(dir, `${id}.test.ts`),
    `import { describe, expect, it } from "vitest";\nimport { metric } from "./${id}";\n\ndescribe("metric ${id}", () => {\n  it("ma id", () => {\n    expect(metric.id).toBe("${id}");\n  });\n});\n`,
  );
  console.log(`OK metric ${id}`);
  console.log(`Wklej do docs/11 §4: | ${id} | TODO | number | … |`);
}

async function ensureDepcruiserStub(name: string): Promise<void> {
  const cfg = path.join(repoRoot, "packages/config/dependency-cruiser.cjs");
  const text = await readFile(cfg, "utf8");
  if (text.includes(`modules/${name}/`)) return;
  console.log(
    `(info) dodaj regułę dependency-cruiser dla ${name} wg docs/01 §4 — szkielet grafu jest w dependency-cruiser.cjs`,
  );
}

async function writeIfAbsent(file: string, content: string): Promise<void> {
  try {
    await readFile(file);
    console.log(`skip (exists): ${path.relative(repoRoot, file)}`);
  } catch {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf8");
  }
}

function pascal(s: string): string {
  return s
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function camel(s: string): string {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function kebab(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
