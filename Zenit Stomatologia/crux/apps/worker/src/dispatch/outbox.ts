import { sql, type CruxDb } from "@crux/db";
import { outbox } from "@crux/db/schema";
import { getEventSchema } from "@crux/platform";
import { systemClock, type Clock } from "@crux/shared/time";
import { topicHandlers, type TopicHandlerContext } from "../topics/index";
import { MAX_OUTBOX_ATTEMPTS, nextAttemptAt, shouldMarkDead } from "./retry";

export type OutboxRow = {
  id: string;
  tenantId: string;
  topic: string;
  payload: Record<string, unknown>;
  attempts: number;
};

let lastDispatchAt = 0;

export function getLastDispatchAt(): number {
  return lastDispatchAt;
}

export function markDispatchNow(clock: Clock = systemClock): void {
  lastDispatchAt = clock.now().getTime();
}

/**
 * Pobiera do `limit` wierszy pending (`FOR UPDATE SKIP LOCKED`), claim lease, przetwarza.
 */
export async function dispatchOutboxBatch(
  db: CruxDb,
  ctxBase: Omit<TopicHandlerContext, "db">,
  opts: { limit?: number; clock?: Clock } = {},
): Promise<{ processed: number; sent: number; dead: number; failed: number }> {
  const limit = opts.limit ?? 50;
  const clock = opts.clock ?? systemClock;
  let sent = 0;
  let dead = 0;
  let failed = 0;

  const rows = await db.withWorker("outbox.dispatch", async (tx) => {
    // Claim: przesuń next_attempt_at (lease), żeby drugi worker nie wziął tych samych.
    const result = await tx.execute(sql`
      with claimed as (
        select id
        from platform.outbox
        where status = 'pending'
          and next_attempt_at <= now()
        order by next_attempt_at
        limit ${limit}
        for update skip locked
      )
      update platform.outbox o
      set next_attempt_at = now() + interval '5 minutes'
      from claimed
      where o.id = claimed.id
      returning
        o.id,
        o.tenant_id as "tenantId",
        o.topic,
        o.payload,
        o.attempts
    `);
    return [...result] as unknown as OutboxRow[];
  });

  const list = Array.isArray(rows) ? rows : [];
  markDispatchNow(clock);

  for (const row of list) {
    const outcome = await processOne(db, ctxBase, row, clock);
    if (outcome === "sent") sent += 1;
    else if (outcome === "dead") dead += 1;
    else failed += 1;
  }

  return { processed: list.length, sent, dead, failed };
}

async function processOne(
  db: CruxDb,
  ctxBase: Omit<TopicHandlerContext, "db">,
  row: OutboxRow,
  clock: Clock,
): Promise<"sent" | "dead" | "failed"> {
  const schema = getEventSchema(row.topic);
  const handler = topicHandlers[row.topic];
  const log = ctxBase.log;

  try {
    if (!schema || !handler) {
      throw new Error(`unknown topic or handler: ${row.topic}`);
    }
    const parsed = schema.safeParse(row.payload);
    if (!parsed.success) {
      throw new Error(`payload schema: ${row.topic}`);
    }

    await db.withWorker("outbox.dispatch", async (tx) => {
      await handler({ ...ctxBase, db }, parsed.data, tx);
      await tx.execute(sql`
        update platform.outbox
        set status = 'sent', last_error = null
        where id = ${row.id}::uuid
      `);
    });
    log.info({ outbox_id: row.id, topic: row.topic, status: "sent" }, "outbox sent");
    return "sent";
  } catch (error) {
    const attempts = row.attempts + 1;
    const message = error instanceof Error ? error.message : "unknown";
    const deadNow = shouldMarkDead(attempts);
    const nextAt = (deadNow ? clock.now() : nextAttemptAt(clock, attempts)).toISOString();
    const status = deadNow ? "dead" : "pending";
    const errText = message.slice(0, 500);

    await db.withWorker("outbox.dispatch", async (tx) => {
      await tx.execute(sql`
        update platform.outbox
        set
          attempts = ${attempts},
          status = ${status},
          next_attempt_at = ${nextAt}::timestamptz,
          last_error = ${errText}
        where id = ${row.id}::uuid
      `);

      if (deadNow) {
        await tx.insert(outbox).values({
          tenantId: row.tenantId,
          topic: "platform.outbox.dead.v1",
          payload: {
            outboxId: row.id,
            topic: row.topic,
            tenantId: row.tenantId,
          },
          status: "pending",
        });
      }
    });

    log.warn(
      {
        outbox_id: row.id,
        topic: row.topic,
        attempts,
        status: deadNow ? "dead" : "pending",
        err: message,
      },
      deadNow ? "outbox dead" : "outbox retry",
    );
    return deadNow ? "dead" : "failed";
  }
}

export { MAX_OUTBOX_ATTEMPTS };
