import type { Violation } from "./types";

export function printReport(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log("crux-doctor: OK (0 naruszeń)");
    return;
  }

  console.log("rule\tlevel\tfile:line\tmessage");
  for (const v of violations) {
    const loc = `${v.file}:${String(v.line)}`;
    console.log(`${v.ruleId}\t${v.level}\t${loc}\t${v.message}`);
    const prefix = v.level === "error" ? "::error" : "::warning";
    console.log(`${prefix} file=${v.file},line=${String(v.line)}::${v.ruleId}: ${v.message}`);
  }

  const errors = violations.filter((v) => v.level === "error").length;
  const warns = violations.filter((v) => v.level === "warn").length;
  console.log(`crux-doctor: ${String(errors)} error(s), ${String(warns)} warning(s)`);
}
