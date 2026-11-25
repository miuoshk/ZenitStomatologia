/** Aktor w transakcji `withActor` — claims JWT (ADR-005). */

export type Actor = {
  readonly staffId: string;
  readonly tenantId: string;
  readonly locationIds: readonly string[];
  readonly activeLocationId: string;
  readonly role: string;
  readonly permissions: readonly string[];
};

/** JSON claims w `request.jwt.claims` (snake_case, jak w `tests.authenticate_as`). */
export type JwtClaims = {
  readonly staff_id: string;
  readonly tenant_id: string;
  readonly location_ids: readonly string[];
  readonly active_location_id: string;
  readonly role: string;
  readonly permissions: readonly string[];
};

export function actorToClaims(actor: Actor): JwtClaims {
  return {
    staff_id: actor.staffId,
    tenant_id: actor.tenantId,
    location_ids: actor.locationIds,
    active_location_id: actor.activeLocationId,
    role: actor.role,
    permissions: actor.permissions,
  };
}

export type WorkerClaims = {
  readonly worker: true;
  readonly operation: string;
};
