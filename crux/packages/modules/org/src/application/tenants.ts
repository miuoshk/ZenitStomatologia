import type { Tx } from "@crux/db";
import { tenants } from "@crux/db/schema";
import type { KeyProvider } from "@crux/shared/crypto";
import { newId } from "@crux/shared/id";
import { ok, type DomainError, type Result } from "@crux/shared/result";

export async function createTenant(
  tx: Tx,
  input: {
    name: string;
    legalName: string;
    nip?: string;
    address?: Record<string, unknown>;
  },
  keys: KeyProvider,
): Promise<Result<{ id: string; dekKeyId: string }, DomainError>> {
  const id = newId();
  const dekKeyId = await keys.currentKeyId(id);
  // Bez RETURNING — SELECT RLS na tenants wymaga id = tenant_id() claims.
  await tx.insert(tenants).values({
    id,
    name: input.name,
    legalName: input.legalName,
    dekKeyId,
    ...(input.nip ? { nip: input.nip } : {}),
    ...(input.address ? { address: input.address } : {}),
  });
  return ok({ id, dekKeyId });
}
