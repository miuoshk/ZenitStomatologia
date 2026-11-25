import type { Actor, Tx } from "@crux/db";
import { memberships, rolePermissions, staffMembers } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { toLocalDay, TZ, type Clock } from "@crux/shared/time";
import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";

/**
 * Buduje `Actor` z `auth_user_id` i aktywnego gabinetu.
 * Członkostwa z `ends_on` < dziś są pomijane.
 */
export async function buildClaims(
  tx: Tx,
  authUserId: string,
  activeLocationId: string,
  clock: Clock,
): Promise<Result<Actor, DomainError>> {
  const today = toLocalDay(clock.now(), TZ);

  const staffRows = await tx
    .select()
    .from(staffMembers)
    .where(and(eq(staffMembers.authUserId, authUserId), eq(staffMembers.active, true)))
    .limit(1);
  const staff = staffRows[0];
  if (!staff) {
    return err({ type: "not_found", details: { entity: "staff_member" } });
  }

  const activeMemberships = await tx
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.staffId, staff.id),
        eq(memberships.tenantId, staff.tenantId),
        or(isNull(memberships.endsOn), gte(memberships.endsOn, today)),
        sql`${memberships.startsOn} <= ${today}`,
      ),
    );

  const locationIds = [...new Set(activeMemberships.map((m) => m.locationId))];
  if (activeMemberships.length > 0 && !locationIds.includes(activeLocationId)) {
    return err({ type: "forbidden", details: { reason: "location_not_in_memberships" } });
  }

  const rolesAtActive = activeMemberships
    .filter((m) => m.locationId === activeLocationId)
    .map((m) => m.role);

  const primaryRole = rolesAtActive[0] ?? activeMemberships[0]?.role ?? "receptionist";

  const rolesForPerms =
    rolesAtActive.length > 0 ? rolesAtActive : activeMemberships.map((m) => m.role);

  let permissions: string[] = [];
  if (rolesForPerms.length > 0) {
    const rows = await tx
      .select({ permission: rolePermissions.permission })
      .from(rolePermissions)
      .where(inArray(rolePermissions.role, rolesForPerms));
    permissions = [...new Set(rows.map((r) => r.permission))];
  }

  return ok({
    staffId: staff.id,
    tenantId: staff.tenantId,
    locationIds,
    activeLocationId: locationIds.includes(activeLocationId)
      ? activeLocationId
      : (locationIds[0] ?? activeLocationId),
    role: primaryRole,
    permissions,
  });
}
