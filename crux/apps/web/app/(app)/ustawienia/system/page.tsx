import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { featureFlags, locations as locationsTable } from "@crux/db/schema";
import { getSetting, settingKeys } from "@crux/platform";
import { formatDateTimePl } from "@crux/shared/time";
import { Card, CardHeader } from "@crux/ui";
import { asc, eq, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { actorWith, NoAccess } from "@/features/settings/guard";
import { getDb } from "@/server/db";
import { FlagToggle, NewFlagForm, OccupancyModeForm, TargetForm } from "./forms";

const TARGET_LABELS: Record<string, string> = {
  "analytics.targets.chair_utilization": L.system.targetChair,
};

export default async function SystemPage() {
  const actor = await actorWith("settings.manage");
  if (!actor) return <NoAccess />;

  const data = await getDb().withActor(actor, async (tx) => {
    const locs = await tx
      .select({ id: locationsTable.id, number: locationsTable.number, name: locationsTable.name })
      .from(locationsTable)
      .where(eq(locationsTable.tenantId, actor.tenantId))
      .orderBy(asc(locationsTable.number));
    const flags = await tx
      .select()
      .from(featureFlags)
      .where(or(isNull(featureFlags.tenantId), eq(featureFlags.tenantId, actor.tenantId)))
      .orderBy(asc(featureFlags.key));
    const targetKeys = Object.keys(settingKeys).filter((k) => k.startsWith("analytics.targets."));
    const perLocation = [];
    for (const l of locs) {
      const mode = await getSetting(tx, actor, "scheduling.occupancy_mode", l.id);
      const targets = [];
      for (const key of targetKeys) {
        const v = await getSetting(tx, actor, key, l.id);
        targets.push({ key, value: typeof v === "number" ? v : 0 });
      }
      perLocation.push({ loc: l, mode: mode.ok && typeof mode.value === "string" ? mode.value : "manual", targets });
    }
    return { locs, flags, perLocation };
  });

  const locLabel = new Map(data.locs.map((l) => [l.id, `${l.number} ${l.name}`]));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{L.system.title}</h1>

      <Card>
        <CardHeader title={L.system.flags} />
        {data.flags.length === 0 ? (
          <p className="mb-4 text-sm text-[var(--text-muted)]">{L.system.flagsNone}</p>
        ) : (
          <table className="mb-6 w-full text-left text-sm" data-testid="flags-table">
            <thead>
              <tr className="text-[var(--text-muted)]">
                <th className="py-2">{L.system.flagCols.key}</th>
                <th>{L.system.flagCols.scope}</th>
                <th>{L.system.flagCols.description}</th>
                <th>{L.system.flagCols.changed}</th>
                <th>{L.system.flagCols.state}</th>
              </tr>
            </thead>
            <tbody>
              {data.flags.map((f) => {
                const description = typeof f.payload?.["description"] === "string" ? f.payload["description"] : "";
                return (
                  <tr key={`${f.key}-${f.tenantId ?? "g"}-${f.locationId ?? "t"}`} className="border-t border-[var(--border)]">
                    <td className="py-2 font-mono">{f.key}</td>
                    <td>
                      {f.tenantId === null
                        ? "globalna"
                        : f.locationId
                          ? `${L.system.scopeLocation} ${locLabel.get(f.locationId) ?? ""}`
                          : L.system.scopeTenant}
                    </td>
                    <td>{description || L.none}</td>
                    <td className="tabular-nums">{f.updatedAt ? formatDateTimePl(f.updatedAt) : L.none}</td>
                    <td>
                      {f.tenantId === null ? (
                        <span>{f.enabled ? L.system.on : L.system.off}</span>
                      ) : (
                        <FlagToggle flagKey={f.key} locationId={f.locationId ?? ""} enabled={f.enabled} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <h4 className="mb-2 text-sm font-bold">{L.system.newFlag}</h4>
        <NewFlagForm locations={data.locs.map((l) => ({ id: l.id, label: `${L.system.scopeLocation} ${l.number} ${l.name}` }))} />
      </Card>

      <Card>
        <CardHeader title={L.system.settings} />
        <div className="space-y-8">
          {data.perLocation.map(({ loc, mode, targets }) => (
            <section key={loc.id} aria-label={`${loc.number} ${loc.name}`}>
              <h4 className="mb-3 font-bold">
                {loc.number} {loc.name}
              </h4>
              <div className="grid gap-6 sm:grid-cols-2">
                <OccupancyModeForm locationId={loc.id} value={mode} />
                {targets.map((t) => (
                  <TargetForm
                    key={t.key}
                    settingKey={t.key}
                    locationId={loc.id}
                    value={t.value}
                    label={TARGET_LABELS[t.key] ?? t.key}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>

      <Link href="/ustawienia/o-crux" className="text-[var(--link)] underline-offset-2 hover:underline">
        {L.system.oCrux}
      </Link>
    </div>
  );
}
