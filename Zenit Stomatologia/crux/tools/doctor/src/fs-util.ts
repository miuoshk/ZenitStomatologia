import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
  ".turbo",
  "storybook-static",
]);

export async function walkFiles(
  root: string,
  opts: { extensions?: readonly string[]; under?: readonly string[] } = {},
): Promise<string[]> {
  const extensions = opts.extensions ?? [".ts", ".tsx", ".js", ".jsx", ".sql", ".css", ".mdc", ".md"];
  const bases = opts.under?.map((u) => path.join(root, u)) ?? [root];
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".cursor") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        await walk(full);
      } else if (e.isFile()) {
        if (extensions.some((ext) => e.name.endsWith(ext))) out.push(full);
      }
    }
  }

  for (const b of bases) await walk(b);
  return out;
}

export function rel(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

export async function readText(file: string): Promise<string> {
  return readFile(file, "utf8");
}

export async function sha256File(file: string): Promise<string> {
  const buf = await readFile(file);
  return createHash("sha256").update(buf).digest("hex");
}

export async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

export function matchIndex(m: RegExpMatchArray): number {
  return typeof m.index === "number" ? m.index : 0;
}

export function matchGroup(m: RegExpMatchArray, n: number): string {
  const g = m[n];
  return typeof g === "string" ? g : "";
}

export function isAllowlisted(
  allowlist: {
    rules: Record<string, ReadonlyArray<{ path?: string; pattern?: string; table?: string; reason: string }>>;
  },
  ruleId: string,
  fileRel: string,
  opts: { pattern?: string; table?: string } = {},
): boolean {
  const entries = allowlist.rules[ruleId] ?? [];
  return entries.some((e) => {
    if (e.table && opts.table && e.table === opts.table) return true;
    if (e.path && (fileRel === e.path || fileRel.startsWith(e.path.replace(/\/$/, "") + "/"))) {
      if (e.pattern && opts.pattern) return new RegExp(e.pattern).test(opts.pattern);
      if (e.pattern) return false;
      return true;
    }
    return false;
  });
}
