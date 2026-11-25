import type { Actor, Tx } from "@crux/db";
import { outbox } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq, sql } from "drizzle-orm";

/** Ponów martwe zdarzenie outbox (dead → pending). Wymaga `integrations.manage`. */
export async function retryDeadOutbox(
  tx: Tx,
  actor: Actor,
  outboxId: string,
): Promise<Result<{ id: string }, DomainError>> {
  if (!actor.permissions.includes("integrations.manage")) {
    return err({ type: "forbidden", details: { reason: "integrations.manage" } });
  }
  const rows = await tx
    .update(outbox)
    .set({ status: "pending", attempts: 0, nextAttemptAt: sql`now()`, lastError: null })
    .where(
      and(
        eq(outbox.id, outboxId),
        eq(outbox.tenantId, actor.tenantId),
        eq(outbox.status, "dead"),
      ),
    )
    .returning({ id: outbox.id });
  if (!rows[0]) return err({ type: "not_found", details: { entity: "outbox" } });
  return ok({ id: outboxId });
}
