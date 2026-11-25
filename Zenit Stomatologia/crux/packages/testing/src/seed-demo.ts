import { pathToFileURL } from "node:url";
import { createDb } from "@crux/db";
import { createFakeKeyProvider } from "./fakes/key-provider";
import { buildGoldenDataset } from "./golden/dataset";
import { resetAndSeedGolden } from "./golden/seed";
import { GOLDEN_TENANT_NAME } from "./golden/constants";

/** Domyślna lista hostów produkcyjnych; rozszerzaj przez `CRUX_PRODUCTION_DB_HOSTS` (csv). */
export const DEFAULT_PRODUCTION_DB_HOSTS = [
  "db.crux.zenitstomatologia.pl",
  "aws-0-eu-central-1.pooler.supabase.com",
] as const;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

/** Zwraca powód blokady albo null, gdy seed jest dozwolony. */
export function assertSeedAllowed(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  let host: string;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return "DATABASE_URL nie jest poprawnym URL-em";
  }
  const denied = [
    ...DEFAULT_PRODUCTION_DB_HOSTS,
    ...(env["CRUX_PRODUCTION_DB_HOSTS"] ?? "").split(",").map((h) => h.trim().toLowerCase()),
  ].filter(Boolean);
  const hit = denied.find((d) => host === d || host.endsWith(`.${d}`) || host.includes(d));
  if (hit) return `host ${host} pasuje do listy produkcyjnej (${hit})`;
  if (!LOCAL_HOSTS.has(host) && env["CRUX_SEED_ALLOW_REMOTE"] !== "1") {
    return `host ${host} nie jest lokalny — ustaw CRUX_SEED_ALLOW_REMOTE=1 (tylko staging)`;
  }
  return null;
}

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("seed:demo: ustaw DATABASE_URL");
  const blocked = assertSeedAllowed(url);
  if (blocked) {
    console.error(`seed:demo ZABLOKOWANE: ${blocked}`);
    process.exit(1);
  }

  console.log("seed:demo — czyszczę fixture (tests.reset_fixtures) i ładuję golden dataset…");
  const dataset = buildGoldenDataset();
  const db = createDb(url, { role: "app" });
  try {
    const s = await resetAndSeedGolden(db, dataset, createFakeKeyProvider(), {
      tenantName: GOLDEN_TENANT_NAME,
    });
    console.log(`Tenant: ${GOLDEN_TENANT_NAME} (${s.tenantId})`);
    for (const l of s.locations) {
      console.log(`  gabinet ${l.number}: ${l.id} · fotele: ${String(l.chairs)}`);
    }
    console.log(
      `Personel: ${String(s.staff)} · wpisy obłożenia: ${String(s.entries)} · blokady: ${String(s.timeBlocks)} · zamknięcia dni: ${String(s.dayClosures)}`,
    );
    console.log(`Okres: ${dataset.start} … ${dataset.end}`);
  } finally {
    await db.close();
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
