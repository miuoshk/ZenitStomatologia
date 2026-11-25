import type { Actor, Tx } from "@crux/db";
import { commandLog } from "@crux/db/schema";
import { ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq } from "drizzle-orm";

export async function findCommand(
  tx: Tx,
  actor: Actor,
  commandId: string,
): Promise<Result<{ result: unknown } | null, DomainError>> {
  const rows = await tx
    .select({ result: commandLog.result })
    .from(commandLog)
    .where(and(eq(commandLog.commandId, commandId), eq(commandLog.tenantId, actor.tenantId)))
    .limit(1);
  const row = rows[0];
  if (!row) return ok(null);
  return ok({ result: row.result });
}

export async function recordCommand(
  tx: Tx,
  actor: Actor,
  input: { commandId: string; name: string; result: unknown },
): Promise<Result<{ commandId: string }, DomainError>> {
  await tx.insert(commandLog).values({
    commandId: input.commandId,
    tenantId: actor.tenantId,
    actorId: actor.staffId,
    name: input.name,
    result: input.result,
  });
  return ok({ commandId: input.commandId });
}
