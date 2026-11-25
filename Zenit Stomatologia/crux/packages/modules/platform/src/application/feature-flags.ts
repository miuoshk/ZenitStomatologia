import type { Tx } from "@crux/db";
import { featureFlags } from "@crux/db/schema";
import { ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq, isNull } from "drizzle-orm";

export type FlagScope = {
  readonly tenantId?: string;
  readonly locationId?: string;
};

/**
 * Flaga włączona? Kolejność: location → tenant → global (tenant_id null).
 */
export async function isEnabled(
  tx: Tx,
  flag: string,
  scope: FlagScope,
): Promise<Result<boolean, DomainError>> {
  if (scope.locationId && scope.tenantId) {
    const atLocation = await tx
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.key, flag),
          eq(featureFlags.tenantId, scope.tenantId),
          eq(featureFlags.locationId, scope.locationId),
        ),
      )
      .limit(1);
    if (atLocation[0]) return ok(atLocation[0].enabled);
  }

  if (scope.tenantId) {
    const atTenant = await tx
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.key, flag),
          eq(featureFlags.tenantId, scope.tenantId),
          isNull(featureFlags.locationId),
        ),
      )
      .limit(1);
    if (atTenant[0]) return ok(atTenant[0].enabled);
  }

  const global = await tx
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(
      and(eq(featureFlags.key, flag), isNull(featureFlags.tenantId), isNull(featureFlags.locationId)),
    )
    .limit(1);

  return ok(global[0]?.enabled ?? false);
}
