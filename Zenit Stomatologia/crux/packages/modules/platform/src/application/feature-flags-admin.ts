import type { Actor, Tx } from "@crux/db";
import { featureFlags } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq, isNull, sql } from "drizzle-orm";

const KEY_RE = /^[a-z][a-z0-9_.]{1,63}$/;

/** Ustawia flagę dla tenanta (lub gabinetu). Upsert; wymaga `settings.manage`. */
export async function setFeatureFlag(
  tx: Tx,
  actor: Actor,
  input: { key: string; enabled: boolean; locationId?: string; description?: string },
): Promise<Result<{ key: string }, DomainError>> {
  if (!actor.permissions.includes("settings.manage")) {
    return err({ type: "forbidden", details: { reason: "settings.manage" } });
  }
  if (!KEY_RE.test(input.key)) {
    return err({ type: "validation", details: { field: "key", code: "flag_key_format" } });
  }
  const scope = and(
    eq(featureFlags.key, input.key),
    eq(featureFlags.tenantId, actor.tenantId),
    input.locationId ? eq(featureFlags.locationId, input.locationId) : isNull(featureFlags.locationId),
  );
  const existing = await tx.select({ key: featureFlags.key }).from(featureFlags).where(scope).limit(1);
  if (existing[0]) {
    await tx
      .update(featureFlags)
      .set({ enabled: input.enabled, updatedAt: sql`now()`, updatedBy: actor.staffId })
      .where(scope);
  } else {
    await tx.insert(featureFlags).values({
      key: input.key,
      tenantId: actor.tenantId,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      enabled: input.enabled,
      ...(input.description ? { payload: { description: input.description } } : {}),
      updatedAt: sql`now()`,
      updatedBy: actor.staffId,
    });
  }
  return ok({ key: input.key });
}
