import type { Actor, CruxDb } from "@crux/db";
import type { KeyProvider } from "@crux/shared/crypto";
import { bootstrapActor, persistTenant, tenantFactory, type TenantParams } from "./tenant";

/** Pełne uprawnienia administracyjne do przygotowania fixture w testach. */
export const ADMIN_PERMISSIONS = [
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

/** Tworzy tenanta (przez usecase) i zwraca aktora-admina. Wywołaj po `resetBetweenTests`. */
export async function bootstrapTenant(
  db: CruxDb,
  keys: KeyProvider,
  params: Partial<TenantParams> = {},
): Promise<{ tenantId: string; admin: Actor }> {
  const boot = bootstrapActor();
  let tenantId = "";
  await db.withActor(boot, async (tx) => {
    const t = await persistTenant(tx, keys, tenantFactory(params));
    if (!t.ok) throw new Error(`bootstrapTenant: ${JSON.stringify(t.error)}`);
    tenantId = t.value.id;
  });
  return { tenantId, admin: { ...boot, tenantId, permissions: ADMIN_PERMISSIONS } };
}
