import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readText } from "../fs-util";
import type { Rule, Violation } from "../types";

export const depsDocumented: Rule = {
  id: "deps.documented",
  level: "error",
  description: "Każda bezpośrednia zależność npm ma wiersz w docs/zaleznosci.md.",
  async check(ctx) {
    const zale = await readText(path.join(ctx.root, "docs/zaleznosci.md"));
    const packageJsons = await findPackageJsons(ctx.root);
    const out: Violation[] = [];

    for (const pkgPath of packageJsons) {
      const raw = JSON.parse(await readFile(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const all = {
        ...(raw.dependencies ?? {}),
        ...(raw.devDependencies ?? {}),
      };
      for (const name of Object.keys(all)) {
        if (name.startsWith("@crux/")) continue;
        if (isDocumented(zale, name)) continue;
        out.push({
          ruleId: this.id,
          level: this.level,
          file: path.relative(ctx.root, pkgPath).split(path.sep).join("/"),
          line: 1,
          message: `Zależność ${name} bez wiersza w docs/zaleznosci.md`,
        });
      }
    }
    return out;
  },
};

function isDocumented(zale: string, name: string): boolean {
  if (zale.includes(`\`${name}\``)) return true;
  if (name.startsWith("@storybook/") && zale.includes("`storybook`")) return true;
  if (name === "storybook" && zale.includes("`storybook`")) return true;
  if ((name === "clsx" || name === "tailwind-merge") && zale.includes("`clsx`")) return true;
  if (
    (name === "react-hook-form" || name === "@hookform/resolvers") &&
    zale.includes("`react-hook-form`")
  ) {
    return true;
  }
  if (name.startsWith("@types/") && zale.includes("`@types/")) return true;
  return false;
}

async function findPackageJsons(root: string): Promise<string[]> {
  const out: string[] = [path.join(root, "package.json")];
  for (const sub of ["apps", "packages", "tools"]) {
    await walk(path.join(root, sub), out);
  }
  return out;
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === ".next") continue;
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name === "package.json") out.push(full);
    else if (e.isDirectory()) await walk(full, out);
  }
}
