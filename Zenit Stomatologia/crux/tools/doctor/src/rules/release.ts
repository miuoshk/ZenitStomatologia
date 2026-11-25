import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAllowlisted, walkFiles } from "../fs-util";
import type { Rule, Violation } from "../types";

/** `create table [if not exists] [patients.]patients…` albo `create schema patients`. */
const CREATE_TABLE_RE =
  /create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_][a-z0-9_]*)"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?/gi;
const CREATE_SCHEMA_RE = /create\s+schema\s+(?:if\s+not\s+exists\s+)?"?patients"?/gi;

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split("\n").length;
}

export const releaseNoPatientTables: Rule = {
  id: "release.no-patient-tables",
  level: "error",
  description: "Wydanie 1.0 (ADR-032): migracje nie tworzą tabel patients* ani schematu patients.",
  async check(ctx) {
    const files = await walkFiles(ctx.root, {
      extensions: [".sql"],
      under: ["supabase/migrations"],
    });
    const out: Violation[] = [];
    for (const file of files) {
      const rel = path.relative(ctx.root, file);
      if (isAllowlisted(ctx.allowlist, this.id, rel)) continue;
      const src = await readFile(file, "utf8");
      const code = src.replace(/--[^\n]*/g, (m) => " ".repeat(m.length));
      for (const m of code.matchAll(CREATE_TABLE_RE)) {
        const schema = m[1]?.toLowerCase();
        const table = m[2]?.toLowerCase() ?? "";
        if (schema === "patients" || table.startsWith("patients")) {
          out.push({
            ruleId: this.id,
            level: this.level,
            file: rel,
            line: lineOf(code, m.index),
            message: `tabela ${schema ? `${schema}.` : ""}${table}: wydanie 1.0 nie przetwarza danych pacjentów (ADR-032); patients* dopiero w 1.1 z etykietą patient-data`,
          });
        }
      }
      for (const m of code.matchAll(CREATE_SCHEMA_RE)) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: rel,
          line: lineOf(code, m.index),
          message: "schemat patients: niedozwolony w wydaniu 1.0 (ADR-032)",
        });
      }
    }
    return out;
  },
};
