import type { Actor, Tx } from "@crux/db";
import { hmacField, type KeyProvider } from "@crux/shared/crypto";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { sql } from "drizzle-orm";

export type LogAccessInput = {
  readonly patientId: string;
  readonly resource: string;
  readonly resourceId?: string;
  readonly action: string;
  readonly justification?: string;
  readonly locationId?: string;
  /** Adres IP — w bazie tylko HMAC (`ip_hash`). */
  readonly ip?: string;
  readonly userAgent?: string;
};

/**
 * Zapis do `audit.access_log` wyłącznie przez `audit.log_access` (security definer).
 */
export async function logAccess(
  tx: Tx,
  actor: Actor,
  input: LogAccessInput,
  keys: KeyProvider,
): Promise<Result<{ id: string }, DomainError>> {
  if (!input.patientId || !input.resource || !input.action) {
    return err({ type: "validation", details: { field: "logAccess", code: "required" } });
  }

  const ipHash = input.ip
    ? Buffer.from(await hmacField(input.ip, actor.tenantId, keys), "hex")
    : null;
  const uaHash = input.userAgent
    ? Buffer.from(await hmacField(input.userAgent, actor.tenantId, keys), "hex")
    : null;

  const locationId = input.locationId ?? actor.activeLocationId;

  const rows = await tx.execute(sql`
    select audit.log_access(
      ${input.patientId}::uuid,
      ${input.resource},
      ${input.resourceId ?? null}::uuid,
      ${input.action},
      ${input.justification ?? null},
      ${ipHash},
      ${uaHash},
      ${locationId}::uuid
    ) as id
  `);

  const row = rows[0] as { id: string } | undefined;
  if (!row?.id) {
    return err({ type: "invariant", details: { code: "log_access_empty" } });
  }
  return ok({ id: row.id });
}
