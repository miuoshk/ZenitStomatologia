import { readFileSync } from "node:fs";
import { join } from "node:path";

function releaseVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "../../package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export default function OCruxPage() {
  const version = releaseVersion();

  return (
    <div className="max-w-xl">
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">O Crux</h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        System wewnętrzny zenit.stomatologia
      </p>
      <div className="mt-8 flex items-start gap-6">
        <img
          src="/brand/ryciny/krasnodrzew.svg"
          alt=""
          aria-hidden
          className="h-24 w-24 text-[var(--zenit-mech)]"
          style={{ filter: "invert(42%) sepia(18%) saturate(700%) hue-rotate(85deg)" }}
        />
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Wersja</dt>
            <dd className="tabular-nums">{version}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Wydanie</dt>
            <dd>1.0 Krasnodrzew</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Wdrożenie</dt>
            <dd>plan: 11.12.2026</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
