/**
 * bootstrap-prod — jednorazowe dane startowe produkcji Crux 1.0 „Krasnodrzew” (K17, podręcznik 12.2).
 *
 * URUCHOMIENIE (ręcznie, raz, z terminala operatora; NIGDY z CI):
 *
 *   1. cp tools/bootstrap-prod.config.example.json /bezpieczne/miejsce/bootstrap.json
 *      i uzupełnij prawdziwe dane (KRS/RPWDL, adresy, e-maile). Plik trzymaj POZA repo.
 *   2. Sprawdzenie na sucho (bez bazy; waliduje konfigurację i strażników):
 *        CRUX_BOOTSTRAP_CONFIG=/bezpieczne/miejsce/bootstrap.json \
 *        CRUX_BOOTSTRAP_PROD=1 CRUX_PRODUCTION_DB_HOSTS=<host-produkcji> \
 *        DATABASE_URL=... pnpm bootstrap:prod --dry-run
 *   3. Uruchomienie właściwe (bez --dry-run), z tymi samymi zmiennymi oraz:
 *        DATABASE_URL         rola crux_app (host produkcyjny, nie localhost)
 *        DATABASE_URL_WORKER  rola crux_worker (tylko odczyt: sprawdzenie, czy tenant już istnieje)
 *        KMS_KEY_ID, KMS_LOCAL_DEK, KMS_LOCAL_PEPPER  klucze produkcyjne (KMS_KEY_ID różne od local-v1)
 *        SUPABASE_URL + SUPABASE_SECRET_KEY  (opcjonalnie) tworzenie kont Auth z hasłem jednorazowym
 *
 * Strażnicy (odwrotność seed:demo): wymaga CRUX_BOOTSTRAP_PROD=1 ORAZ hosta z listy
 * CRUX_PRODUCTION_DB_HOSTS (csv) albo CRUX_BOOTSTRAP_ALLOWED_HOSTS (csv). Localhost zawsze odrzucony.
 * Jeśli tenant o podanej nazwie już istnieje — skrypt przerywa (uruchamiany raz).
 *
 * Hasła jednorazowe są drukowane na stdout JEDEN raz (nigdy do pliku ani logu); przekaż je osobiście,
 * MFA użytkownik rejestruje przy pierwszym logowaniu. Bez SUPABASE_SECRET_KEY konta Auth zakłada się w UI
 * (Ustawienia → Personel → Zaproś).
 *
 * Skrypt NIE zawiera ani nie wymyśla danych pacjentów ani prawdziwych danych osobowych lekarzy.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createDb, sql, type Actor, type CruxDb } from "@crux/db";
import { locations, tenants, type StaffRole } from "@crux/db/schema";
import {
  assignMembership,
  createStaffMember,
  inviteStaffMember,
  type AuthAdminPort,
} from "@crux/identity";
import { createChair, createLocation, createTenant, replaceWeeklyHours } from "@crux/org";
import { setFeatureFlag, setSetting } from "@crux/platform";
import { LocalKeyProvider, type KeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
  "0.0.0.0",
]);

const BOOTSTRAP_PERMISSIONS = [
  "network.view",
  "org.manage",
  "staff.manage",
  "settings.manage",
  "occupancy.read",
  "occupancy.write",
  "occupancy.void",
  "occupancy.close_day",
  "occupancy.write_closed",
  "occupancy.override_hours",
] as const;

const REQUIRED_FLAGS = ["oblozenie", "pulpit", "ustawienia", "integracje"] as const;
const ROLES: readonly StaffRole[] = [
  "network_admin",
  "location_manager",
  "dentist",
  "hygienist",
  "assistant",
  "receptionist",
  "accountant",
  "auditor",
];

type Hours = { opens: string; closes: string } | null;

export type BootstrapConfig = {
  tenant: {
    name: string;
    legalName: string;
    nip?: string;
    regon?: string;
    rpwdlBookNumber?: string;
    address?: Record<string, unknown>;
  };
  openingValidFrom: string;
  locations: Array<{
    number: string;
    name: string;
    colorKey: "01" | "02" | "03" | "04";
    resortCode?: string;
    openedOn?: string;
    address: Record<string, unknown>;
    phone?: string;
    email?: string;
    chairs: number;
    /** 7 pozycji: pon…niedz.; null = zamknięte. */
    weeklyHours: Hours[];
    occupancyMode: "manual" | "appointments";
    chairUtilizationTarget: number;
  }>;
  staff: Array<{
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    /** Numery gabinetów (np. ["01"]); network_admin dostaje oba, jeśli puste. */
    locations: string[];
    title?: string;
    npwz?: string;
  }>;
  featureFlags: string[];
};

export class BootstrapConfigError extends Error {}

function fail(msg: string): never {
  throw new BootstrapConfigError(msg);
}

/** Ręczna walidacja konfiguracji (bez dodatkowych zależności). */
export function parseConfig(raw: unknown): BootstrapConfig {
  if (typeof raw !== "object" || raw === null) fail("konfiguracja musi być obiektem JSON");
  const c = raw as Partial<BootstrapConfig>;
  const t = c.tenant;
  if (!t?.name || !t.legalName) fail("tenant.name i tenant.legalName są wymagane");
  if (!c.openingValidFrom || !/^\d{4}-\d{2}-\d{2}$/.test(c.openingValidFrom)) {
    fail("openingValidFrom: oczekiwano YYYY-MM-DD");
  }
  if (!Array.isArray(c.locations) || c.locations.length === 0) fail("locations: min. 1 gabinet");
  const numbers = new Set<string>();
  for (const l of c.locations) {
    if (!/^\d{2}$/.test(l.number)) fail(`gabinet ${l.number}: numer musi mieć format NN`);
    if (numbers.has(l.number)) fail(`gabinet ${l.number}: duplikat`);
    numbers.add(l.number);
    if (!l.name || Object.keys(l.address).length === 0)
      fail(`gabinet ${l.number}: name i address są wymagane`);
    if (!Number.isInteger(l.chairs) || l.chairs < 1) fail(`gabinet ${l.number}: chairs ≥ 1`);
    if (!Array.isArray(l.weeklyHours) || l.weeklyHours.length !== 7) {
      fail(`gabinet ${l.number}: weeklyHours musi mieć 7 pozycji (pon…niedz.)`);
    }
    for (const h of l.weeklyHours) {
      if (
        h &&
        (!/^\d{2}:\d{2}$/.test(h.opens) || !/^\d{2}:\d{2}$/.test(h.closes) || h.opens >= h.closes)
      ) {
        fail(`gabinet ${l.number}: niepoprawne godziny otwarcia`);
      }
    }
    if (!["manual", "appointments"].includes(l.occupancyMode)) {
      fail(`gabinet ${l.number}: occupancyMode`);
    }
    if (
      typeof l.chairUtilizationTarget !== "number" ||
      l.chairUtilizationTarget < 0 ||
      l.chairUtilizationTarget > 100
    ) {
      fail(`gabinet ${l.number}: chairUtilizationTarget 0–100`);
    }
  }
  if (!Array.isArray(c.staff) || !c.staff.some((s) => s.role === "network_admin")) {
    fail("staff: wymagany co najmniej jeden network_admin");
  }
  const emails = new Set<string>();
  for (const s of c.staff) {
    if (!s.firstName || !s.lastName || !s.email.includes("@"))
      fail(`staff ${s.email}: niepełne dane`);
    if (!ROLES.includes(s.role)) fail(`staff ${s.email}: nieznana rola ${s.role}`);
    if (emails.has(s.email.toLowerCase()))
      fail(`staff ${s.email}: duplikat e-maila (konta imienne)`);
    emails.add(s.email.toLowerCase());
    for (const n of s.locations)
      if (!numbers.has(n)) fail(`staff ${s.email}: nieznany gabinet ${n}`);
    if (s.role !== "network_admin" && s.locations.length === 0) {
      fail(`staff ${s.email}: rola ${s.role} wymaga gabinetu`);
    }
  }
  const flags = c.featureFlags ?? [...REQUIRED_FLAGS];
  for (const f of REQUIRED_FLAGS) if (!flags.includes(f)) fail(`featureFlags: brakuje ${f}`);
  return { ...(c as BootstrapConfig), featureFlags: flags };
}

/** Powód blokady albo null, gdy bootstrap jest dozwolony. */
export function assertBootstrapAllowed(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env["CRUX_BOOTSTRAP_PROD"] !== "1")
    return "ustaw CRUX_BOOTSTRAP_PROD=1 (świadome uruchomienie)";
  let host: string;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return "DATABASE_URL nie jest poprawnym URL-em";
  }
  if (LOCAL_HOSTS.has(host))
    return `host ${host} jest lokalny — bootstrap:prod jest tylko dla produkcji (lokalnie: seed:demo)`;
  const allowed = [env["CRUX_PRODUCTION_DB_HOSTS"] ?? "", env["CRUX_BOOTSTRAP_ALLOWED_HOSTS"] ?? ""]
    .join(",")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0)
    return "ustaw CRUX_PRODUCTION_DB_HOSTS (lub CRUX_BOOTSTRAP_ALLOWED_HOSTS)";
  if (!allowed.some((a) => host === a || host.endsWith(`.${a}`))) {
    return `host ${host} nie znajduje się na liście dozwolonych hostów produkcyjnych`;
  }
  if ((env["KMS_KEY_ID"] ?? "local-v1") === "local-v1") {
    return "KMS_KEY_ID nie może być local-v1 (klucze lokalne) — ustaw klucz produkcyjny";
  }
  return null;
}

export type CreatedStaff = {
  id: string;
  email: string;
  role: StaffRole;
  temporaryPassword?: string;
};
export type BootstrapSummary = {
  tenantId: string;
  locations: Array<{ number: string; id: string; chairs: number }>;
  staff: CreatedStaff[];
  authInvited: boolean;
  /** Błędy zakładania kont Auth (po zatwierdzeniu danych w bazie) — do poprawy w UI. */
  authFailures: Array<{ email: string; reason: string }>;
};

function bootstrapActorFor(tenantId: string, staffId: string, locationIds: string[] = []): Actor {
  return {
    staffId,
    tenantId,
    locationIds,
    activeLocationId: locationIds[0] ?? staffId,
    role: "network_admin",
    permissions: BOOTSTRAP_PERMISSIONS,
  };
}

function must<T>(r: { ok: true; value: T } | { ok: false; error: unknown }, what: string): T {
  if (!r.ok) throw new Error(`${what}: ${JSON.stringify(r.error)}`);
  return r.value;
}

function oneTimePassword(): string {
  // 18 bajtów → 24 znaki base64url; spełnia typowe wymagania polityki haseł.
  return `${randomBytes(18).toString("base64url")}!a1`;
}

/** Główna logika (eksportowana do testów integracyjnych na bazie stagingowej/lokalnej). */
export async function runBootstrap(
  db: CruxDb,
  keys: KeyProvider,
  config: BootstrapConfig,
  authAdmin: AuthAdminPort | null,
  today: string,
): Promise<BootstrapSummary> {
  // Faza 1: tenant (aktor „bootstrap” z losowym tenantem — wzorzec jak w testing/factories).
  const boot = bootstrapActorFor(newId(), newId());
  const tenant = await db.withActor(boot, (tx) =>
    createTenant(
      tx,
      {
        name: config.tenant.name,
        legalName: config.tenant.legalName,
        ...(config.tenant.nip ? { nip: config.tenant.nip } : {}),
        ...(config.tenant.address ? { address: config.tenant.address } : {}),
      },
      keys,
    ),
  );
  const tenantId = must(tenant, "createTenant").id;

  // Faza 2: reszta w jednej transakcji z aktorem nowego tenanta.
  const firstAdmin = config.staff.find((s) => s.role === "network_admin");
  if (!firstAdmin) throw new Error("brak network_admin");

  const created = await db.withActor(bootstrapActorFor(tenantId, newId()), async (tx) => {
    if (config.tenant.regon || config.tenant.rpwdlBookNumber) {
      await tx
        .update(tenants)
        .set({
          ...(config.tenant.regon ? { regon: config.tenant.regon } : {}),
          ...(config.tenant.rpwdlBookNumber
            ? { rpwdlBookNumber: config.tenant.rpwdlBookNumber }
            : {}),
        })
        .where(sql`${tenants.id} = ${tenantId}`);
    }

    // Pierwszy network_admin → staff.id używany jako aktor audytu dalszych kroków.
    const first = must(
      await createStaffMember(tx, bootstrapActorFor(tenantId, newId()), {
        firstName: firstAdmin.firstName,
        lastName: firstAdmin.lastName,
        email: firstAdmin.email,
        ...(firstAdmin.title ? { title: firstAdmin.title } : {}),
      }),
      `staff ${firstAdmin.email}`,
    );
    const actor = bootstrapActorFor(tenantId, first.id);

    const locs: BootstrapSummary["locations"] = [];
    const locIdByNumber = new Map<string, string>();
    for (const l of config.locations) {
      const { id } = must(
        await createLocation(tx, actor, {
          number: l.number,
          name: l.name,
          colorKey: l.colorKey,
          address: l.address,
          ...(l.phone ? { phone: l.phone } : {}),
          ...(l.email ? { email: l.email } : {}),
        }),
        `gabinet ${l.number}`,
      );
      locIdByNumber.set(l.number, id);
      if (l.resortCode || l.openedOn) {
        await tx
          .update(locations)
          .set({
            ...(l.resortCode ? { resortCode: l.resortCode } : {}),
            ...(l.openedOn ? { openedOn: l.openedOn } : {}),
          })
          .where(sql`${locations.id} = ${id}`);
      }
      for (let i = 1; i <= l.chairs; i += 1) {
        must(
          await createChair(tx, actor, { locationId: id, name: `Fotel ${String(i)}`, position: i }),
          `fotel ${l.number}/${String(i)}`,
        );
      }
      must(
        await replaceWeeklyHours(tx, actor, {
          locationId: id,
          validFrom: config.openingValidFrom,
          hours: l.weeklyHours.map((h, i) => (h ? { weekday: i + 1, ...h } : null)),
        }),
        `godziny ${l.number}`,
      );
      must(
        await setSetting(tx, actor, "scheduling.occupancy_mode", l.occupancyMode, id),
        `tryb ${l.number}`,
      );
      must(
        await setSetting(
          tx,
          actor,
          "analytics.targets.chair_utilization",
          l.chairUtilizationTarget,
          id,
        ),
        `cel ${l.number}`,
      );
      locs.push({ number: l.number, id, chairs: l.chairs });
    }

    const staff: CreatedStaff[] = [];
    for (const s of config.staff) {
      const id =
        s === firstAdmin
          ? first.id
          : must(
              await createStaffMember(tx, actor, {
                firstName: s.firstName,
                lastName: s.lastName,
                email: s.email,
                ...(s.title ? { title: s.title } : {}),
                ...(s.npwz ? { npwz: s.npwz } : {}),
              }),
              `staff ${s.email}`,
            ).id;
      const numbers = s.locations.length > 0 ? s.locations : [...locIdByNumber.keys()];
      for (const n of numbers) {
        const locationId = locIdByNumber.get(n);
        if (!locationId) continue;
        must(
          await assignMembership(tx, actor, {
            staffId: id,
            locationId,
            role: s.role,
            startsOn: today,
          }),
          `członkostwo ${s.email}/${n}`,
        );
      }
      staff.push({ id, email: s.email, role: s.role });
    }

    for (const key of config.featureFlags) {
      must(await setFeatureFlag(tx, actor, { key, enabled: true }), `flaga ${key}`);
    }
    return { locs, staff, actor };
  });

  // Faza 3: konta Auth (poza transakcją bazy; hasła tylko w pamięci → stdout).
  const authFailures: BootstrapSummary["authFailures"] = [];
  if (authAdmin) {
    for (const s of created.staff) {
      const password = oneTimePassword();
      try {
        await db.withActor(created.actor, async (tx) =>
          must(
            await inviteStaffMember(
              tx,
              created.actor,
              { staffId: s.id, email: s.email, temporaryPassword: password },
              authAdmin,
            ),
            `zaproszenie ${s.email}`,
          ),
        );
        s.temporaryPassword = password;
      } catch (e) {
        authFailures.push({
          email: s.email,
          reason: e instanceof Error ? e.message : "nieznany błąd",
        });
      }
    }
  }

  return {
    tenantId,
    locations: created.locs,
    staff: created.staff,
    authInvited: authAdmin !== null,
    authFailures,
  };
}

async function tenantExists(workerUrl: string, name: string): Promise<boolean> {
  const worker = createDb(workerUrl, { role: "worker" });
  try {
    const rows = await worker.withWorker("analytics.refresh", (tx) =>
      tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(sql`${tenants.name} = ${name}`)
        .limit(1),
    );
    return rows.length > 0;
  } finally {
    await worker.close();
  }
}

function createAuthAdmin(): AuthAdminPort | null {
  const url = process.env["SUPABASE_URL"];
  const secret = process.env["SUPABASE_SECRET_KEY"];
  if (!url || !secret) return null;
  const base = url.replace(/\/+$/, "");
  const headers = {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
  return {
    async createUser({ email, password }) {
      // GoTrue Admin API; bez supabase-js (zero nowych zależności). Hasła i klucza nie logujemy.
      const res = await fetch(`${base}/auth/v1/admin/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { must_change_password: true },
        }),
      });
      if (!res.ok) throw new Error(`Auth admin: HTTP ${String(res.status)}`);
      const body = (await res.json()) as { id?: string };
      if (!body.id) throw new Error("Auth admin: brak id użytkownika");
      return { authUserId: body.id };
    },
    resetMfa() {
      return Promise.resolve({ removed: 0 });
    },
  };
}

const HELP = `Użycie: pnpm bootstrap:prod [--dry-run] [--help]
Zmienne: CRUX_BOOTSTRAP_PROD=1, CRUX_PRODUCTION_DB_HOSTS, CRUX_BOOTSTRAP_CONFIG, DATABASE_URL,
         DATABASE_URL_WORKER, KMS_KEY_ID/KMS_LOCAL_DEK/KMS_LOCAL_PEPPER, [SUPABASE_URL, SUPABASE_SECRET_KEY]
Szczegóły: komentarz na początku tools/bootstrap-prod.ts oraz docs/ops/wdrozenie-produkcyjne.md.`;

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    console.log(HELP);
    return;
  }
  const dryRun = args.has("--dry-run");

  const configPath = process.env["CRUX_BOOTSTRAP_CONFIG"];
  const url = process.env["DATABASE_URL"];
  if (!configPath) throw new Error("bootstrap:prod: ustaw CRUX_BOOTSTRAP_CONFIG (ścieżka do JSON)");
  if (!url) throw new Error("bootstrap:prod: ustaw DATABASE_URL");

  const blocked = assertBootstrapAllowed(url);
  if (blocked) {
    console.error(`bootstrap:prod ZABLOKOWANE: ${blocked}`);
    process.exit(1);
  }
  const config = parseConfig(JSON.parse(readFileSync(configPath, "utf8")));
  if (JSON.stringify(config).includes("TODO")) {
    console.warn(
      "UWAGA: konfiguracja zawiera wartości TODO — upewnij się, że to zamierzone placeholdery.",
    );
  }
  if (dryRun) {
    console.log(
      `bootstrap:prod --dry-run OK: tenant „${config.tenant.name}”, gabinety: ${config.locations.map((l) => l.number).join(", ")}, personel: ${String(config.staff.length)}. Nic nie zapisano.`,
    );
    return;
  }

  const workerUrl = process.env["DATABASE_URL_WORKER"];
  if (!workerUrl) {
    console.error("bootstrap:prod: ustaw DATABASE_URL_WORKER (kontrola, czy tenant już istnieje)");
    process.exit(1);
  }
  if (await tenantExists(workerUrl, config.tenant.name)) {
    console.error(
      `bootstrap:prod PRZERWANE: tenant „${config.tenant.name}” już istnieje. Skrypt uruchamia się tylko raz; dalsze zmiany robi się w UI (Ustawienia).`,
    );
    process.exit(1);
  }

  const authAdmin = createAuthAdmin();
  // Początek członkostw = początek obowiązywania godzin (bez zegara systemowego w skrypcie).
  const today = config.openingValidFrom;
  const db = createDb(url, { role: "app" });
  try {
    const s = await runBootstrap(db, new LocalKeyProvider(), config, authAdmin, today);
    console.log(
      `\nbootstrap:prod — gotowe (${today}). Tenant: ${config.tenant.name} (${s.tenantId})`,
    );
    for (const l of s.locations)
      console.log(`  gabinet ${l.number}: ${l.id} · fotele: ${String(l.chairs)}`);
    console.log("Personel (id · rola · e-mail):");
    for (const p of s.staff) console.log(`  ${p.id} · ${p.role} · ${p.email}`);
    if (s.authInvited) {
      console.log(
        "\nHASŁA JEDNORAZOWE — wyświetlone TYLKO TERAZ. Przekaż osobiście; nie zapisuj w plikach ani czacie:",
      );
      for (const p of s.staff) {
        if (p.temporaryPassword) console.log(`  ${p.email}  ${p.temporaryPassword}`);
      }
      for (const f of s.authFailures) {
        console.error(`  BŁĄD konta ${f.email}: ${f.reason} — zaproś w UI`);
      }
    } else {
      console.log(
        "\nBrak SUPABASE_SECRET_KEY: wiersze personelu utworzone, konta Auth NIE. Zaproś osoby w UI (Ustawienia → Personel).",
      );
    }
    console.log(
      "\nWpis do ledger.md: „1.0 · bootstrap produkcji” z powyższymi identyfikatorami (bez haseł).",
    );
  } finally {
    await db.close();
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
