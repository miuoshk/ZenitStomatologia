import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { outbox, refreshLog } from "@crux/db/schema";
import { formatDateTimePl } from "@crux/shared/time";
import { Card, CardHeader, KpiTile, StatusPill } from "@crux/ui";
import { desc, eq, sql } from "drizzle-orm";
import { actorWith, NoAccess } from "@/features/settings/guard";
import { getDb } from "@/server/db";
import { RetryButton } from "./retry-button";

async function workerHealthy(): Promise<boolean> {
  const url = process.env["WORKER_HEALTH_URL"] ?? "http://localhost:8081/healthz";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function IntegracjePage() {
  const actor = await actorWith("integrations.manage");
  if (!actor) return <NoAccess />;

  const [data, healthy] = await Promise.all([
    getDb().withActor(actor, async (tx) => {
      const counts = await tx
        .select({ status: outbox.status, n: sql<number>`count(*)::int` })
        .from(outbox)
        .where(eq(outbox.tenantId, actor.tenantId))
        .groupBy(outbox.status);
      const select = {
        id: outbox.id,
        topic: outbox.topic,
        status: outbox.status,
        attempts: outbox.attempts,
        createdAt: outbox.createdAt,
      };
      const dead = await tx
        .select(select)
        .from(outbox)
        .where(sql`${outbox.tenantId} = ${actor.tenantId} and ${outbox.status} = 'dead'`)
        .orderBy(desc(outbox.createdAt))
        .limit(20);
      const recent = await tx
        .select(select)
        .from(outbox)
        .where(eq(outbox.tenantId, actor.tenantId))
        .orderBy(desc(outbox.createdAt))
        .limit(100);
      const refresh = await tx.select().from(refreshLog).orderBy(desc(refreshLog.startedAt)).limit(1);
      return { counts, dead, recent, refresh: refresh[0] };
    }),
    workerHealthy(),
  ]);

  const count = (s: string) => data.counts.find((c) => c.status === s)?.n ?? 0;
  const I = L.integrations;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{I.title}</h1>

      <Card>
        <CardHeader title={I.ports} />
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[var(--text-muted)]">
              <th className="py-2">{I.portCols.name}</th>
              <th>{I.portCols.status}</th>
              <th>{I.portCols.note}</th>
            </tr>
          </thead>
          <tbody>
            {I.portsList.map((p) => (
              <tr key={p.name} className="border-t border-[var(--border)]">
                <td className="py-2 font-semibold">{p.name}</td>
                <td>{p.status}</td>
                <td className="text-[var(--text-muted)]">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader title={I.worker} />
        <div className="space-y-2 text-sm" data-testid="worker-health">
          <StatusPill status={healthy ? "dobrze" : "krytyczne"}>{healthy ? I.workerOk : I.workerDown}</StatusPill>
          <p>
            {I.lastRefresh}:{" "}
            {data.refresh
              ? `${formatDateTimePl(data.refresh.startedAt)} · ${data.refresh.mode} · ${String(data.refresh.rowsWritten ?? 0)}`
              : I.noRefresh}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title={I.outbox} />
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile label={I.pending} value={count("pending")} />
          <KpiTile label={I.dead} value={count("dead")} status={count("dead") > 0 ? "krytyczne" : "dobrze"} />
          <KpiTile label={I.sent} value={count("sent")} />
        </div>
        <h4 className="mb-2 mt-6 text-sm font-bold">{I.deadList}</h4>
        {data.dead.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{I.none}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] text-sm" data-testid="dead-list">
            {data.dead.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 py-2">
                <span className="font-mono">{d.topic}</span>
                <span className="tabular-nums">{d.attempts}×</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{d.id}</span>
                <span className="ml-auto">
                  <RetryButton id={d.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={I.recent} />
        {data.recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{I.none}</p>
        ) : (
          <table className="w-full text-left text-xs" data-testid="outbox-recent">
            <thead>
              <tr className="text-[var(--text-muted)]">
                <th className="py-1">{I.cols.topic}</th>
                <th>{I.cols.status}</th>
                <th>{I.cols.attempts}</th>
                <th>{I.cols.created}</th>
                <th>{I.cols.id}</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="py-1 font-mono">{r.topic}</td>
                  <td>{r.status}</td>
                  <td className="tabular-nums">{r.attempts}</td>
                  <td className="tabular-nums">{formatDateTimePl(r.createdAt)}</td>
                  <td className="font-mono">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
