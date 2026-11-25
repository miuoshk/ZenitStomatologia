import type { Actor, Tx } from "@crux/db";
import { outbox } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq } from "drizzle-orm";
import { getEventSchema } from "../events/registry.js";

export type PublishEventOpts = {
  readonly dedupeKey?: string;
};

/**
 * Zapis zdarzenia do `platform.outbox` w tej samej transakcji co komenda.
 * Nieznany temat → err; powtórzony dedupeKey → OK bez drugiego wiersza.
 */
export async function publishEvent(
  tx: Tx,
  actor: Actor,
  topic: string,
  payload: Record<string, unknown>,
  opts: PublishEventOpts = {},
): Promise<Result<{ id: string; deduped: boolean }, DomainError>> {
  const schema = getEventSchema(topic);
  if (!schema) {
    return err({ type: "validation", details: { field: "topic", code: "unknown_event" } });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return err({ type: "validation", details: { field: "payload", code: "schema" } });
  }

  if (opts.dedupeKey) {
    const existing = await tx
      .select({ id: outbox.id })
      .from(outbox)
      .where(and(eq(outbox.tenantId, actor.tenantId), eq(outbox.dedupeKey, opts.dedupeKey)))
      .limit(1);
    const row = existing[0];
    if (row) {
      return ok({ id: row.id, deduped: true });
    }
  }

  const inserted = await tx
    .insert(outbox)
    .values({
      tenantId: actor.tenantId,
      topic,
      payload: parsed.data,
      ...(opts.dedupeKey ? { dedupeKey: opts.dedupeKey } : {}),
      status: "pending",
    })
    .onConflictDoNothing(
      opts.dedupeKey
        ? { target: [outbox.tenantId, outbox.dedupeKey] }
        : undefined,
    )
    .returning({ id: outbox.id });

  const created = inserted[0];
  if (!created) {
    if (opts.dedupeKey) {
      const again = await tx
        .select({ id: outbox.id })
        .from(outbox)
        .where(and(eq(outbox.tenantId, actor.tenantId), eq(outbox.dedupeKey, opts.dedupeKey)))
        .limit(1);
      const id = again[0]?.id;
      if (id) return ok({ id, deduped: true });
    }
    return err({ type: "conflict", details: { constraint: "outbox_dedupe" } });
  }

  return ok({ id: created.id, deduped: false });
}
