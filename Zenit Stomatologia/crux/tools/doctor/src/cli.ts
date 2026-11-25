#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./db";
import { printReport } from "./report";
import { rules } from "./rules/index";
import type { Allowlist, DoctorContext, Vocabulary, Violation } from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));
const doctorRoot = path.resolve(here, "..");
const repoRoot = path.resolve(doctorRoot, "../..");

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2).filter((a) => a !== "--"));
  const updateLock = args.has("--update-lock");
  const skipDb = args.has("--skip-db");
  const strictDb = args.has("--strict-db");

  const allowlist = JSON.parse(
    await readFile(path.join(doctorRoot, "allowlist.json"), "utf8"),
  ) as Allowlist;
  const vocabulary = JSON.parse(
    await readFile(path.join(doctorRoot, "vocabulary.json"), "utf8"),
  ) as Vocabulary;

  const dbUrl = process.env["DATABASE_URL"] ?? process.env["DATABASE_URL_WORKER"];
  const db = skipDb ? null : await connectDb(dbUrl);

  const ctx: DoctorContext = {
    root: repoRoot,
    allowlist,
    vocabulary,
    updateLock,
    db,
  };

  const violations: Violation[] = [];
  for (const rule of rules) {
    if (skipDb && rule.requiresDb) continue;
    const found = await rule.check(ctx);
    violations.push(...found);
  }

  if (db) await db.end();

  printReport(violations);

  const errors = violations.filter((v) => v.level === "error");
  // Ostrzeżenia requires-db (DB down) nie failują lokalnie bez --strict-db
  const blocking = errors.filter((v) => strictDb || !v.requiresDb || v.message.indexOf("pominięt") < 0);

  if (blocking.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(2);
});
