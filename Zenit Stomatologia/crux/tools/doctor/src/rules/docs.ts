import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exists, readText, rel } from "../fs-util";
import type { Rule, Violation } from "../types";

const LOCK = "docs/.rules-lock.json";

export const docsRulesChecksum: Rule = {
  id: "docs.rules-checksum",
  level: "warn",
  description: "AGENTS.md i .cursor/rules/* mają sumy w docs/.rules-lock.json.",
  async check(ctx) {
    const targets = await collectRuleFiles(ctx.root);
    const lockPath = path.join(ctx.root, LOCK);
    const current: Record<string, string> = {};
    for (const file of targets) {
      const r = rel(ctx.root, file);
      const buf = await readFile(file);
      current[r] = createHash("sha256").update(buf).digest("hex");
    }

    if (ctx.updateLock) {
      await writeFile(lockPath, `${JSON.stringify({ files: current }, null, 2)}\n`, "utf8");
      return [
        {
          ruleId: this.id,
          level: "info",
          file: LOCK,
          line: 1,
          message: `Zaktualizowano lock (${String(Object.keys(current).length)} plików)`,
        },
      ];
    }

    if (!(await exists(lockPath))) {
      return [
        {
          ruleId: this.id,
          level: this.level,
          file: LOCK,
          line: 1,
          message: "Brak docs/.rules-lock.json — uruchom pnpm doctor --update-lock",
        },
      ];
    }

    const lock = JSON.parse(await readText(lockPath)) as { files?: Record<string, string> };
    const locked = lock.files ?? {};
    const out: Violation[] = [];
    for (const [file, hash] of Object.entries(current)) {
      if (locked[file] !== hash) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file,
          line: 1,
          message: "Zmiana reguł bez aktualizacji locka — pnpm doctor --update-lock",
        });
      }
    }
    for (const file of Object.keys(locked)) {
      if (!(file in current)) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file,
          line: 1,
          message: "Plik usunięty z reguł, a nadal w locku — pnpm doctor --update-lock",
        });
      }
    }
    return out;
  },
};

async function collectRuleFiles(root: string): Promise<string[]> {
  const out: string[] = [path.join(root, "AGENTS.md")];
  const rulesDir = path.join(root, ".cursor/rules");
  try {
    const entries = await readdir(rulesDir);
    for (const e of entries) {
      if (e.endsWith(".mdc") || e.endsWith(".md")) out.push(path.join(rulesDir, e));
    }
  } catch {
    /* empty */
  }
  return out;
}

