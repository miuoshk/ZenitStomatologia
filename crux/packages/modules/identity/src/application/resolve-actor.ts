import type { Actor, Tx } from "@crux/db";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { sql } from "drizzle-orm";

type ActorJson = {
  staffId: string;
  tenantId: string;
  locationIds: string[];
  activeLocationId: string;
  role: string;
  permissions: string[];
};

/**
 * Bootstrap Actor z `auth.users.id` przez `identity.resolve_actor` (security definer).
 * Wywoływać na połączeniu `crux_app` **bez** `set local role authenticated`.
 */
export async function resolveActor(
  tx: Tx,
  authUserId: string,
  activeLocationId: string | null,
): Promise<Result<Actor, DomainError>> {
  const rows = await tx.execute(
    sql`select identity.resolve_actor(${authUserId}, ${activeLocationId}) as actor`,
  );
  const list = rows as unknown as ReadonlyArray<{ actor: ActorJson | null }>;
  const raw = list[0]?.actor;
  if (!raw) {
    return err({ type: "not_found", details: { entity: "staff_member" } });
  }
  return ok({
    staffId: raw.staffId,
    tenantId: raw.tenantId,
    locationIds: Array.isArray(raw.locationIds) ? raw.locationIds : [],
    activeLocationId: raw.activeLocationId,
    role: raw.role,
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  });
}
