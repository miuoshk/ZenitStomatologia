import type { Actor, Tx } from "@crux/db";
import { auditEvents } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { newId } from "@crux/shared/id";

export type AuthorizeScope = {
  readonly locationId?: string;
};

/**
 * Sprawdza uprawnienie w claims. Przy `scope.locationId` wymaga członkostwa
 * w gabinecie, chyba że aktor ma `network.view`.
 * Odrzucenie → `forbidden` + wpis `audit.events` (action=forbidden).
 */
export async function authorize(
  tx: Tx,
  actor: Actor,
  permission: string,
  scope?: AuthorizeScope,
): Promise<Result<true, DomainError>> {
  const hasPerm = actor.permissions.includes(permission);
  const locationOk =
    !scope?.locationId ||
    actor.permissions.includes("network.view") ||
    actor.locationIds.includes(scope.locationId);

  if (hasPerm && locationOk) {
    return ok(true);
  }

  await tx.insert(auditEvents).values({
    id: newId(),
    tenantId: actor.tenantId,
    actorId: actor.staffId,
    actorRole: actor.role,
    tableName: "identity.authorize",
    rowId: actor.staffId,
    action: "forbidden",
    before: null,
    after: {
      permission,
      ...(scope?.locationId ? { locationId: scope.locationId } : {}),
    },
    reason: "authorize_denied",
  });

  return err({ type: "forbidden", details: { reason: permission } });
}
