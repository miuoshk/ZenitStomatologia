import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readText, walkFiles } from "../fs-util";
import type { Rule, Violation } from "../types";

/**
 * Specyfikacje ze statusem „w realizacji” / „wdrożona” — każde ACn musi mieć test [ID/ACn].
 */
export const specTraceability: Rule = {
  id: "spec.traceability",
  level: "error",
  description: "AC ze specyfikacji w realizacji/wdrożona mają test [ID/ACn].",
  async check(ctx) {
    const specsDir = path.join(ctx.root, "docs/specs");
    let specs: string[] = [];
    try {
      specs = (await readdir(specsDir)).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }

    const testFiles = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx", ".sql"],
      under: ["apps", "packages", "supabase/tests"],
    });
    const testBlob = (
      await Promise.all(testFiles.map(async (f) => readFile(f, "utf8").catch(() => "")))
    ).join("\n");

    const out: Violation[] = [];
    for (const spec of specs) {
      const text = await readText(path.join(specsDir, spec));
      const statusMatch = /status\s*:\s*([^\n]+)/i.exec(text) ?? /\*\*Status\*\*\s*\|\s*([^\n|]+)/i.exec(text);
      const status = (statusMatch?.[1] ?? "").toLowerCase();
      const active =
        status.includes("w realizacji") ||
        status.includes("wdrożona") ||
        status.includes("wdrozona");
      if (!active) continue;

      const idMatch = /^(F\d+-\d+)/i.exec(spec) ?? /\b(F\d+-\d+)\b/.exec(text);
      const specId = idMatch?.[1] ?? spec.replace(/\.md$/, "");
      const acNums: string[] = [];
      for (const m of text.matchAll(/\bAC(\d+)\b/g)) {
        const num = m[1];
        if (typeof num === "string") acNums.push(num);
      }
      for (const n of new Set(acNums)) {
        const tag = `[${specId}/AC${n}]`;
        if (!testBlob.includes(tag)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: `docs/specs/${spec}`,
            line: 1,
            message: `Brak testu z tagiem ${tag}`,
          });
        }
      }
    }
    return out;
  },
};
