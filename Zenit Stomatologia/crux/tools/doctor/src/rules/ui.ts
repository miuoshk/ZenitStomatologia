import path from "node:path";
import { exists, lineOf, matchGroup, matchIndex, readText, rel, sha256File, walkFiles } from "../fs-util";
import type { Rule, Violation } from "../types";

export const uiNoHex: Rule = {
  id: "ui.no-hex",
  level: "error",
  description: "Bez HEX w UI (poza brand/ i tokens.extra.css).",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx", ".css"],
      under: ["apps/web", "packages/ui/src"],
    });
    const out: Violation[] = [];
    const re = /#([0-9a-fA-F]{3,8})\b|\[#/;
    for (const file of files) {
      const r = rel(ctx.root, file);
      if (r.includes("/brand/") || r.endsWith("tokens.extra.css")) continue;
      const text = await readText(file);
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (re.test(line)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: i + 1,
            message: "HEX w UI — użyj tokenów CSS (ui.no-hex)",
          });
        }
      }
    }
    return out;
  },
};

export const uiBrandSync: Rule = {
  id: "ui.brand-sync",
  level: "error",
  description: "Sumy plików packages/ui/brand/ zgodne z brand/manifest.json.",
  async check(ctx) {
    const manifestPath = path.join(ctx.root, "packages/ui/brand/manifest.json");
    if (!(await exists(manifestPath))) {
      return [
        {
          ruleId: this.id,
          level: this.level,
          file: "packages/ui/brand/manifest.json",
          line: 1,
          message: "Brak manifest.json — uruchom brand:sync",
        },
      ];
    }
    const raw = JSON.parse(await readText(manifestPath)) as {
      files?: Record<string, string>;
    };
    const files = raw.files ?? {};
    const out: Violation[] = [];
    for (const [relPath, expected] of Object.entries(files)) {
      // manifest keys like "brand/tokens.css" → packages/ui/brand/...
      const disk = path.join(ctx.root, "packages/ui", relPath);
      if (!(await exists(disk))) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: relPath,
          line: 1,
          message: `Brak pliku z manifestu: ${relPath}`,
        });
        continue;
      }
      const actual = await sha256File(disk);
      if (actual !== expected) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: relPath,
          line: 1,
          message: `Checksum mismatch (manifest ${expected.slice(0, 12)}… ≠ ${actual.slice(0, 12)}…)`,
        });
      }
    }
    return out;
  },
};

export const uiBrandSeparation: Rule = {
  id: "ui.brand-separation",
  level: "error",
  description: "Bez crux-* / CruxLogo w documents/, messaging/, (public)/.",
  async check(ctx) {
    const under = [
      "packages/ui/src/documents",
      "packages/modules/messaging",
      "apps/web/app/(public)",
    ];
    const out: Violation[] = [];
    for (const u of under) {
      const files = await walkFiles(ctx.root, {
        extensions: [".ts", ".tsx", ".css", ".svg"],
        under: [u],
      });
      for (const file of files) {
        const r = rel(ctx.root, file);
        const base = path.basename(file);
        if (/^crux-/i.test(base) || /CruxLogo/.test(base)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: 1,
            message: "Plik marki Crux w strefie dokumentów/public — separacja marki",
          });
        }
        const text = await readText(file).catch(() => "");
        if (/CruxLogo/.test(text) || /crux-[a-z]+-logo/i.test(text)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: lineOf(text, text.search(/CruxLogo|crux-/i)),
            message: "Odwołanie do CruxLogo / crux-* w strefie zabronionej",
          });
        }
      }
    }
    return out;
  },
};

export const uiMetricForm: Rule = {
  id: "ui.metric-form",
  level: "warn",
  description: "runMetric('<id>') → forma z rejestru (gdy analytics gotowe).",
  async check(ctx) {
    // Pełna walidacja od K13/K14 — dziś ostrzeżenie tylko gdy jest runMetric bez formy.
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: ["apps/web"],
    });
    const out: Violation[] = [];
    const re = /runMetric\(\s*['"]([^'"]+)['"]/g;
    for (const file of files) {
      const text = await readText(file);
      const r = rel(ctx.root, file);
      for (const m of text.matchAll(re)) {
        out.push({
          ruleId: this.id,
          level: "info",
          file: r,
          line: lineOf(text, matchIndex(m)),
          message: `runMetric('${matchGroup(m, 1)}') — sprawdź formę po K13 (metricRegistry)`,
        });
      }
    }
    return out;
  },
};

