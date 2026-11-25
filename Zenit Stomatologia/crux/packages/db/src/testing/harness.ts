import { sql } from "drizzle-orm";
import { createDb, type CruxDb, type Tx } from "../client";
import type { Actor } from "../actor";
import { PRIVILEGED_OPERATIONS } from "../privileged";

export const STAFF_ROLES = [
  "network_admin",
  "location_manager",
  "dentist",
  "hygienist",
  "assistant",
  "receptionist",
  "accountant",
  "auditor",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type TestStaff = {
  readonly id: string;
  readonly tenantId: string;
  readonly role: StaffRole;
  readonly permissions: readonly string[];
  readonly locationIds: readonly string[];
};

export type TestTenantFixture = {
  readonly tenantA: string;
  readonly tenantB: string;
  readonly location01: string;
  readonly location02: string;
  readonly staffA: Readonly<Record<StaffRole, TestStaff>>;
  readonly staffB: TestStaff;
  actorFor(staff: TestStaff, activeLocationId?: string): Actor;
};

const DEFAULT_TRUNCATE = [
  "tests.memberships",
  "tests.staff",
  "tests.locations",
  "tests.tenants",
  "tests.handles",
] as const;

function envUrl(name: "DATABASE_URL" | "DATABASE_URL_WORKER", fallback: string): string {
  return process.env[name] ?? fallback;
}

/** Lokalny Supabase — bezpośredni port (pooler 54329 wymaga tenant id). */
export function createTestDb(kind: "app" | "worker" = "app"): CruxDb {
  if (kind === "worker") {
    const url = envUrl(
      "DATABASE_URL_WORKER",
      "postgresql://crux_worker:crux_worker_local_only@127.0.0.1:54322/postgres",
    );
    return createDb(url, { role: "worker", privilegedOperations: PRIVILEGED_OPERATIONS });
  }
  const url = envUrl(
    "DATABASE_URL",
    "postgresql://crux_app:crux_app_local_only@127.0.0.1:54322/postgres",
  );
  return createDb(url, { role: "app" });
}

export async function resetBetweenTests(
  db: CruxDb,
  _tables: readonly string[] = DEFAULT_TRUNCATE,
): Promise<void> {
  // TRUNCATE wymaga właściciela — security definer (migracja 0003).
  await db.drizzle.execute(sql`select tests.reset_fixtures()`);
}

export async function withTestTenant(db: CruxDb): Promise<TestTenantFixture> {
  await resetBetweenTests(db);

  const tenantA = await scalarUuid(db, `select tests.create_tenant('tenant_a')`);
  const tenantB = await scalarUuid(db, `select tests.create_tenant('tenant_b')`);
  const location01 = await scalarUuid(
    db,
    `select tests.create_location('${tenantA}'::uuid, '01')`,
  );
  const location02 = await scalarUuid(
    db,
    `select tests.create_location('${tenantA}'::uuid, '02')`,
  );
  await scalarUuid(db, `select tests.create_location('${tenantB}'::uuid, '01')`);

  const staffA = {} as Record<StaffRole, TestStaff>;
  for (const role of STAFF_ROLES) {
    const perms = defaultPermissions(role);
    const locs =
      role === "network_admin"
        ? [location01, location02]
        : role === "location_manager"
          ? [location01, location02]
          : [location01];
    const id = await createStaff(db, tenantA, role, locs, perms);
    staffA[role] = {
      id,
      tenantId: tenantA,
      role,
      permissions: perms,
      locationIds: locs,
    };
  }

  const locationB01 = await scalarUuid(
    db,
    `select id from tests.locations where tenant_id = '${tenantB}'::uuid and number = '01'`,
  );
  const staffBId = await createStaff(db, tenantB, "receptionist", [locationB01], [
    "occupancy.read",
  ]);
  const staffB: TestStaff = {
    id: staffBId,
    tenantId: tenantB,
    role: "receptionist",
    permissions: ["occupancy.read"],
    locationIds: [locationB01],
  };

  return {
    tenantA,
    tenantB,
    location01,
    location02,
    staffA,
    staffB,
    actorFor(staff, activeLocationId) {
      const active = activeLocationId ?? staff.locationIds[0] ?? location01;
      return {
        staffId: staff.id,
        tenantId: staff.tenantId,
        locationIds: staff.locationIds,
        activeLocationId: active,
        role: staff.role,
        permissions: staff.permissions,
      };
    },
  };
}

async function createStaff(
  db: CruxDb,
  tenantId: string,
  role: string,
  locationIds: readonly string[],
  permissions: readonly string[],
): Promise<string> {
  const locs = locationIds.length
    ? `array[${locationIds.map((id) => `'${id}'::uuid`).join(",")}]::uuid[]`
    : `'{}'::uuid[]`;
  const perms = JSON.stringify(permissions).replace(/'/g, "''");
  return scalarUuid(
    db,
    `select tests.create_staff('${tenantId}'::uuid, '${role}', ${locs}, '${perms}'::jsonb)`,
  );
}

function defaultPermissions(role: StaffRole): string[] {
  switch (role) {
    case "network_admin":
      return ["network.view", "org.manage"];
    case "location_manager":
      return ["network.view", "settlement.view_all", "occupancy.read"];
    case "receptionist":
      return ["occupancy.read", "appointment.create"];
    case "dentist":
    case "hygienist":
      return ["occupancy.read", "clinical_entry.sign"];
    case "assistant":
      return ["occupancy.read"];
    case "accountant":
      return ["settlement.view_all"];
    case "auditor":
      return ["audit.read"];
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

async function scalarUuid(db: CruxDb, query: string): Promise<string> {
  const rows = await db.drizzle.execute(sql.raw(query));
  const row: Record<string, unknown> | undefined = rows[0];
  if (!row) throw new Error(`scalarUuid: empty result for ${query}`);
  const value = Object.values(row)[0];
  if (typeof value !== "string") {
    throw new Error(`scalarUuid: expected uuid string, got ${typeof value}`);
  }
  return value;
}

/** Odczyt claims helpera w transakcji (testy). */
export async function readTenantId(tx: Tx): Promise<string | null> {
  const rows = await tx.execute(sql`select extensions.tenant_id() as tenant_id`);
  const row = rows[0] as { tenant_id: string | null } | undefined;
  return row?.tenant_id ?? null;
}

export async function readClaimsRaw(tx: Tx): Promise<string | null> {
  const rows = await tx.execute(
    sql`select current_setting('request.jwt.claims', true) as claims`,
  );
  const row = rows[0] as { claims: string | null } | undefined;
  const raw = row?.claims;
  if (raw === null || raw === undefined || raw === "") return null;
  return raw;
}
