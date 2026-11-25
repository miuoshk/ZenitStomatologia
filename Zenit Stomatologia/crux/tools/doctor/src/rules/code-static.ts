import { isAllowlisted, lineOf, matchIndex, readText, rel, walkFiles } from "../fs-util";
import type { DoctorContext, Rule, Violation } from "../types";

const CODE_UNDER = ["apps", "packages", "tools"];

export const codeNoAny: Rule = {
  id: "code.no-any",
  level: "error",
  description: "Zakaz `any` / `as any` w TS (poza allowlistą).",
  async check(ctx) {
    return scanRegex(ctx, this, /\bas\s+any\b|: any\b|<any>/g);
  },
};

export const codeNoAsUnknown: Rule = {
  id: "code.no-as-unknown",
  level: "error",
  description: "Zakaz `as unknown` (poza allowlistą).",
  async check(ctx) {
    return scanRegex(ctx, this, /\bas\s+unknown\b/g);
  },
};

export const codeNoNewDate: Rule = {
  id: "code.no-new-date",
  level: "error",
  description: "`new Date()` tylko w packages/shared/src/time.ts.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: CODE_UNDER,
    });
    const out: Violation[] = [];
    const re = /\bnew\s+Date\s*\(/g;
    for (const file of files) {
      const r = rel(ctx.root, file);
      if (r === "packages/shared/src/time.ts" || r.startsWith("packages/shared/src/time/")) continue;
      if (r.startsWith("tools/doctor/")) continue;
      if (r.endsWith(".test.ts") || r.endsWith(".test.tsx")) continue;
      const text = await readText(file);
      for (const m of text.matchAll(re)) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: r,
          line: lineOf(text, matchIndex(m)),
          message: "Użyj Clock / @crux/shared/time — new Date() zabronione (ADR-022)",
        });
      }
    }
    return out;
  },
};

export const codeNoServiceRole: Rule = {
  id: "code.no-service-role",
  level: "error",
  description: "Zakaz użycia service_role w kodzie.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx", ".js"],
      under: ["apps", "packages"],
    });
    const out: Violation[] = [];
    const re = /service_role/g;
    for (const file of files) {
      const r = rel(ctx.root, file);
      if (r.endsWith(".md") || r.includes("README")) continue;
      const text = await readText(file);
      for (const m of text.matchAll(re)) {
        const line = lineOf(text, matchIndex(m));
        const lineText = text.split("\n")[line - 1] ?? "";
        if (lineText.trimStart().startsWith("*") || lineText.trimStart().startsWith("//") || lineText.includes("Zero `service_role`") || lineText.includes("zero `service_role`")) {
          continue;
        }
        out.push({
          ruleId: this.id,
          level: this.level,
          file: r,
          line,
          message: "service_role zabronione — użyj crux_app / crux_worker",
        });
      }
    }
    return out;
  },
};

export const codeNoSecurityDefiner: Rule = {
  id: "code.no-security-definer",
  level: "error",
  description: "security definer tylko na allowliście migracji.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".sql"],
      under: ["supabase/migrations"],
    });
    const out: Violation[] = [];
    const re = /security\s+definer/gi;
    for (const file of files) {
      const r = rel(ctx.root, file);
      if (isAllowlisted(ctx.allowlist, this.id, r)) continue;
      const text = await readText(file);
      for (const m of text.matchAll(re)) {
        const line = lineOf(text, matchIndex(m));
        const lineText = text.split("\n")[line - 1] ?? "";
        if (lineText.trimStart().startsWith("--")) continue;
        out.push({
          ruleId: this.id,
          level: this.level,
          file: r,
          line,
          message: "security definer poza allowlistą — dodaj uzasadnienie w allowlist.json",
        });
      }
    }
    return out;
  },
};

export const codeModuleImports: Rule = {
  id: "code.module-imports",
  level: "error",
  description: "Brak importów packages/modules/*/src/.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: CODE_UNDER,
    });
    const out: Violation[] = [];
    const re = /from\s+["'][^"']*packages\/modules\/[^"']+\/src\//g;
    const re2 = /from\s+["']@crux\/[^"']+\/src(\/|["'])/g;
    for (const file of files) {
      const r = rel(ctx.root, file);
      const text = await readText(file);
      for (const reX of [re, re2]) {
        for (const m of text.matchAll(reX)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: lineOf(text, matchIndex(m)),
            message: "Importuj tylko publiczne @crux/<pakiet>, nigdy …/src/",
          });
        }
      }
    }
    return out;
  },
};

export const codeThinServerAction: Rule = {
  id: "code.thin-server-action",
  level: "error",
  description: "Pliki 'use server': funkcja ≤ 25 linii.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: ["apps/web"],
    });
    const out: Violation[] = [];
    for (const file of files) {
      const text = await readText(file);
      if (!text.includes("'use server'") && !text.includes('"use server"')) continue;
      const r = rel(ctx.root, file);
      const fnRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
      for (const m of text.matchAll(fnRe)) {
        const start = matchIndex(m);
        const bodyStart = text.indexOf("{", start);
        if (bodyStart < 0) continue;
        const end = findMatchingBrace(text, bodyStart);
        if (end < 0) continue;
        const lines = text.slice(bodyStart, end + 1).split("\n").length;
        if (lines > 25) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: lineOf(text, start),
            message: `server action ${m[1] ?? "?"} ma ${String(lines)} linii (max 25)`,
          });
        }
      }
    }
    return out;
  },
};

export const codeUsecaseAuthorize: Rule = {
  id: "code.usecase-authorize",
  level: "error",
  description: "application/* z Actor w sygnaturze musi wołać authorize(.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts"],
      under: ["packages/modules"],
    });
    const out: Violation[] = [];
    for (const file of files) {
      const r = rel(ctx.root, file);
      if (!r.includes("/application/") || r.endsWith(".test.ts")) continue;
      // sama definicja authorize; platforma nie zależy od identity (ADR graf)
      if (r.endsWith("/authorize.ts")) continue;
      if (r.includes("/modules/platform/")) continue;
      const text = await readText(file);
      const exportsActor =
        /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\bActor\b/.test(text) ||
        /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*actor\s*:\s*Actor/.test(text);
      if (!exportsActor) continue;
      // authorize( albo cienki wrapper (np. authorizeWrite → authorize)
      if (!/\bauthorize\w*\(/.test(text)) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: r,
          line: 1,
          message: "Przypadek użycia z Actor musi wywołać authorize(",
        });
      }
    }
    return out;
  },
};

export const codeVocabulary: Rule = {
  id: "code.vocabulary",
  level: "error",
  description: "Zakazane synonimy domenowe (docs/03).",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: ["apps", "packages/modules"],
    });
    const out: Violation[] = [];
    const words = ctx.vocabulary.forbidden;
    for (const file of files) {
      const r = rel(ctx.root, file);
      // i18n wyjątek
      if (r.includes("/i18n/") || r.includes("packages/i18n")) continue;
      const text = await readText(file);
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (ctx.vocabulary.ignoreLinePatterns.some((p) => new RegExp(p).test(line))) continue;
        for (const w of words) {
          const re = new RegExp(`\\b${w}\\b`, "i");
          if (!re.test(line)) continue;
          if (isAllowlisted(ctx.allowlist, this.id, r, { pattern: line })) continue;
          // "use client" już w ignore; pomiń importy React
          if (w === "client" && /use client/.test(line)) continue;
          if (w === "doctor" && /@crux\/doctor|crux-doctor|pnpm doctor/.test(line)) continue;
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line: i + 1,
            message: `Zakazany synonim „${w}” — patrz docs/03 §1 / vocabulary.json`,
          });
        }
      }
    }
    return out;
  },
};

async function scanRegex(ctx: DoctorContext, rule: Rule, re: RegExp): Promise<Violation[]> {
  const files = await walkFiles(ctx.root, {
    extensions: [".ts", ".tsx"],
    under: CODE_UNDER,
  });
  const out: Violation[] = [];
  for (const file of files) {
    const r = rel(ctx.root, file);
    if (isAllowlisted(ctx.allowlist, rule.id, r)) continue;
    if (r.includes("tools/doctor")) continue;
    const text = await readText(file);
    for (const m of text.matchAll(re)) {
      out.push({
        ruleId: rule.id,
        level: rule.level,
        file: r,
        line: lineOf(text, matchIndex(m)),
        message: rule.description,
      });
    }
  }
  return out;
}

function findMatchingBrace(text: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

