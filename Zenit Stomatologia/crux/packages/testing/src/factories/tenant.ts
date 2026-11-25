import type { Actor, Tx } from "@crux/db";
import { createTenant } from "@crux/org";
import type { KeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import type { DomainError, Result } from "@crux/shared/result";

export type TenantParams = { name: string; legalName: string; nip?: string };

export function tenantFactory(overrides: Partial<TenantParams> = {}): TenantParams {
  return {
    name: "Zenit Stomatologia DEMO",
    legalName: "Zenit Stomatologia DEMO sp. z o.o. (dane syntetyczne)",
    ...overrides,
  };
}

/** Aktor „bootstrap” — jedyny sposób na utworzenie tenanta przed istnieniem personelu. */
export function bootstrapActor(tenantId: string = newId()): Actor {
  return {
    staffId: newId(),
    tenantId,
    locationIds: [],
    activeLocationId: newId(),
    role: "network_admin",
    permissions: ["org.manage"],
  };
}

export async function persistTenant(
  tx: Tx,
  keys: KeyProvider,
  params: TenantParams = tenantFactory(),
): Promise<Result<{ id: string; dekKeyId: string }, DomainError>> {
  return createTenant(tx, params, keys);
}
