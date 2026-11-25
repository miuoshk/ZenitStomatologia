import { existsSync } from "node:fs";
import path from "node:path";
import { isAllowlisted } from "../fs-util";
import type { Rule, Violation } from "../types";

const DOMAIN_SCHEMAS = ["public", "analytics", "org", "identity", "platform", "audit"] as const;
const RLS_SCHEMAS = ["public", "analytics"] as const;

export const dbRlsRequired: Rule = {
  id: "db.rls-required",
  level: "error",
  description: "Tabele public/analytics: RLS + ≥1 polityka.",
  requiresDb: true,
  async check(ctx) {
    if (!ctx.db) return dbUnavailable(this);
    const rows = await ctx.db.query<{
      nspname: string;
      relname: string;
      relrowsecurity: boolean;
      policies: string;
    }>(`
      select n.nspname, c.relname, c.relrowsecurity,
        coalesce((
          select count(*)::text from pg_policy p where p.polrelid = c.oid
        ), '0') as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[])
        and c.relkind = 'r'
        and c.relname not like 'pg_%'
      order by 1, 2
    `, [RLS_SCHEMAS]);

    const out: Violation[] = [];
    for (const row of rows) {
      const table = `${row.nspname}.${row.relname}`;
      if (isAllowlisted(ctx.allowlist, this.id, table, { table })) continue;
      if (!row.relrowsecurity || Number(row.policies) < 1) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: "supabase/migrations",
          line: 1,
          message: `${table}: brak RLS lub polityk (rls=${String(row.relrowsecurity)}, policies=${row.policies})`,
          requiresDb: true,
        });
      }
    }
    return out;
  },
};

export const dbPgtapRequired: Rule = {
  id: "db.pgtap-required",
  level: "error",
  description: "Każda tabela domenowa ma pokrycie pgTAP (plik lub allowlista).",
  requiresDb: true,
  async check(ctx) {
    if (!ctx.db) return dbUnavailable(this);
    const rows = await ctx.db.query<{ nspname: string; relname: string }>(`
      select n.nspname, c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[])
        and c.relkind = 'r'
        and c.relname not like 'pg_%'
        and c.relname not like '%_probe'
      order by 1, 2
    `, [DOMAIN_SCHEMAS]);

    const out: Violation[] = [];
    for (const row of rows) {
      const table = `${row.nspname}.${row.relname}`;
      if (isAllowlisted(ctx.allowlist, this.id, table, { table })) continue;
      const candidates = [
        path.join(ctx.root, "supabase/tests", `${row.relname}.sql`),
        path.join(ctx.root, "supabase/tests", `${row.nspname}_${row.relname}.sql`),
      ];
      if (candidates.some((c) => existsSync(c))) continue;
      out.push({
        ruleId: this.id,
        level: this.level,
        file: "supabase/tests",
        line: 1,
        message: `${table}: brak supabase/tests/<tabela>.sql (lub wpisu allowlist)`,
        requiresDb: true,
      });
    }
    return out;
  },
};

export const dbTableComment: Rule = {
  id: "db.table-comment",
  level: "error",
  description: "Komentarz tabeli zawiera rls: i append_only:.",
  requiresDb: true,
  async check(ctx) {
    if (!ctx.db) return dbUnavailable(this);
    const rows = await ctx.db.query<{ nspname: string; relname: string; comment: string | null }>(`
      select n.nspname, c.relname, obj_description(c.oid) as comment
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[])
        and c.relkind = 'r'
        and c.relname not like '%_probe'
      order by 1, 2
    `, [DOMAIN_SCHEMAS]);

    const out: Violation[] = [];
    for (const row of rows) {
      const table = `${row.nspname}.${row.relname}`;
      if (isAllowlisted(ctx.allowlist, this.id, table, { table })) continue;
      const c = row.comment ?? "";
      if (!/rls\s*:/i.test(c) || !/append_only\s*:/i.test(c)) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: "supabase/migrations",
          line: 1,
          message: `${table}: komentarz musi zawierać rls: i append_only:`,
          requiresDb: true,
        });
      }
    }
    return out;
  },
};

export const dbAppendOnlyGrants: Rule = {
  id: "db.append-only-grants",
  level: "error",
  description: "append_only: yes → brak update/delete dla authenticated.",
  requiresDb: true,
  async check(ctx) {
    if (!ctx.db) return dbUnavailable(this);
    const comments = await ctx.db.query<{
      nspname: string;
      relname: string;
      comment: string | null;
    }>(`
      select n.nspname, c.relname, obj_description(c.oid) as comment
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[])
        and c.relkind = 'r'
    `, [DOMAIN_SCHEMAS]);

    const policies = await ctx.db.query<{
      schemaname: string;
      tablename: string;
      cmd: string;
      roles: string;
    }>(`
      select schemaname, tablename, cmd, roles::text as roles
      from pg_policies
      where schemaname = any($1::text[])
        and cmd in ('UPDATE', 'DELETE', 'ALL')
    `, [DOMAIN_SCHEMAS]);

    const out: Violation[] = [];
    for (const row of comments) {
      const c = row.comment ?? "";
      if (!/append_only\s*:\s*yes/i.test(c)) continue;
      const table = `${row.nspname}.${row.relname}`;
      if (isAllowlisted(ctx.allowlist, this.id, table, { table })) continue;
      const bad = policies.some(
        (p) =>
          p.schemaname === row.nspname &&
          p.tablename === row.relname &&
          (p.roles.includes("authenticated") || p.roles === "{public}"),
      );
      if (bad) {
        out.push({
          ruleId: this.id,
          level: this.level,
          file: "supabase/migrations",
          line: 1,
          message: `${table}: append_only ma politykę update/delete/all dla authenticated`,
          requiresDb: true,
        });
      }
    }
    return out;
  },
};

function dbUnavailable(rule: Rule): Violation[] {
  return [
    {
      ruleId: rule.id,
      level: "warn",
      file: "tools/doctor",
      line: 1,
      message: "DB niedostępna — reguła pominięta (requires-db). Uruchom lokalnie z DATABASE_URL.",
      requiresDb: true,
    },
  ];
}

