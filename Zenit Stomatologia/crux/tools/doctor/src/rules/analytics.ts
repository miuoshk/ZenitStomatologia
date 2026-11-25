import { lineOf, matchGroup, matchIndex, readText, rel, walkFiles } from "../fs-util";
import type { Rule, Violation } from "../types";

const FORBIDDEN_COLS = [
  "first_name",
  "last_name",
  "phone",
  "email",
  "address",
];

export const analyticsMetricRegistered: Rule = {
  id: "analytics.metric-registered",
  level: "error",
  description: "runMetric id musi być w metricRegistry + docs/11 §4.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".ts", ".tsx"],
      under: ["apps/web"],
    });
    const registryPath = `${ctx.root}/packages/modules/analytics/src/metrics/registry.ts`;
    let registryText = "";
    try {
      registryText = await readText(registryPath);
    } catch {
      // K13 jeszcze nie — brak runMetric = OK; obecność runMetric bez rejestru = error
    }
    const docs11 = await readText(`${ctx.root}/docs/11-dashboardy-i-raporty.md`).catch(() => "");
    const out: Violation[] = [];
    const re = /runMetric\(\s*['"]([^'"]+)['"]/g;
    for (const file of files) {
      const text = await readText(file);
      const r = rel(ctx.root, file);
      for (const m of text.matchAll(re)) {
        const id = matchGroup(m, 1);
        const line = lineOf(text, matchIndex(m));
        if (!registryText) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line,
            message: `runMetric('${id}') bez metricRegistry (K13) — usuń lub dodaj rejestr`,
          });
          continue;
        }
        if (!registryText.includes(`'${id}'`) && !registryText.includes(`"${id}"`)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line,
            message: `runMetric('${id}') brak w metricRegistry`,
          });
        }
        if (!docs11.includes(id)) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: r,
            line,
            message: `runMetric('${id}') brak w docs/11 §4`,
          });
        }
      }
    }
    return out;
  },
};

export const analyticsNoPii: Rule = {
  id: "analytics.no-pii",
  level: "error",
  description: "Zakazane kolumny PII w schemacie analytics.",
  requiresDb: true,
  async check(ctx) {
    if (!ctx.db) {
      return [
        {
          ruleId: this.id,
          level: "warn",
          file: "tools/doctor",
          line: 1,
          message: "DB niedostępna — analytics.no-pii pominięte (requires-db)",
          requiresDb: true,
        },
      ];
    }
    const rows = await ctx.db.query<{ table_name: string; column_name: string }>(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'analytics'
    `);
    const out: Violation[] = [];
    for (const row of rows) {
      const col = row.column_name.toLowerCase();
      const bad =
        FORBIDDEN_COLS.includes(col) ||
        col.startsWith("pesel");
      if (bad) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: "supabase/migrations",
          line: 1,
          message: `analytics.${row.table_name}.${row.column_name} — kolumna PII zabroniona`,
          requiresDb: true,
        });
      }
    }
    return out;
  },
};
