import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BACKUP_EXCLUDED_SCHEMAS, BACKUP_SCHEMAS, pgDump } from "./backup-nightly";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../supabase/migrations");

async function schemasFromMigrations(): Promise<string[]> {
  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql"));
  const found = new Set<string>();
  for (const f of files) {
    const sql = await readFile(path.join(MIGRATIONS, f), "utf8");
    for (const m of sql.matchAll(/create schema(?: if not exists)?\s+([a-z_]+)/gi)) {
      if (m[1]) found.add(m[1].toLowerCase());
    }
  }
  return [...found].sort();
}

describe("backup.nightly", () => {
  it("kopia obejmuje każdy schemat z migracji poza celowo pominiętymi", async () => {
    const covered = new Set<string>([...BACKUP_SCHEMAS, ...BACKUP_EXCLUDED_SCHEMAS]);
    const missing = (await schemasFromMigrations()).filter((s) => !covered.has(s));
    expect(missing).toEqual([]);
    for (const s of ["org", "identity", "scheduling", "audit"]) {
      expect(BACKUP_SCHEMAS).toContain(s);
    }
  });

  it("pg_dump jako crux_backup zrzuca dane operacyjne mimo RLS (requires-db)", async () => {
    const url =
      process.env["DATABASE_URL_BACKUP"] ??
      "postgresql://crux_backup:crux_backup_local_only@127.0.0.1:54322/postgres";
    const dir = await mkdtemp(path.join(tmpdir(), "crux-backup-test-"));
    const out = path.join(dir, "crux.dump");
    try {
      await pgDump(url, out, [...BACKUP_SCHEMAS]);
      expect((await stat(out)).size).toBeGreaterThan(0);
      const list = execFileSync("pg_restore", ["--list", out], { encoding: "utf8" });
      for (const table of [
        "scheduling chair_occupancy",
        "scheduling occupancy_day_closures",
        "identity staff_members",
        "identity memberships",
        "org locations",
        "org chairs",
        "audit events",
      ]) {
        expect(list).toContain(`TABLE DATA ${table}`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
