import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import {
  auditEvents,
  chairs as chairsTable,
  locations as locationsTable,
  openingExceptions,
  openingHours,
} from "@crux/db/schema";
import { toLocalDay, systemClock, formatDateTimePl } from "@crux/shared/time";
import { Card, CardHeader, LocationChip } from "@crux/ui";
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { actorWith, NoAccess } from "@/features/settings/guard";
import { getDb } from "@/server/db";
import {
  AddChairForm,
  ChairsList,
  ExceptionForm,
  HoursForm,
  LocationForm,
  type HoursValue,
  type LocationFormValue,
} from "./forms";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ORG_TABLES = ["locations", "chairs", "opening_hours", "opening_exceptions"];
const COLOR_ALIAS: Record<string, string> = { loc1: "01", loc2: "02", loc3: "03", loc4: "04" };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function OrganizacjaPage({ searchParams }: Props) {
  const actor = await actorWith("org.manage");
  if (!actor) return <NoAccess />;
  const raw = await searchParams;
  const tab = one(raw["tab"]) === "historia" ? "historia" : "gabinety";
  const today = toLocalDay(systemClock.now());

  const data = await getDb().withActor(actor, async (tx) => {
    const locs = await tx
      .select()
      .from(locationsTable)
      .where(eq(locationsTable.tenantId, actor.tenantId))
      .orderBy(asc(locationsTable.number));
    const selected = locs.find((l) => l.id === one(raw["gabinet"])) ?? locs[0];
    if (!selected) return { locs, selected: undefined, chairRows: [], hourRows: [], exceptionRows: [] };
    const [chairRows, hourRows, exceptionRows] = await Promise.all([
      tx.select().from(chairsTable).where(eq(chairsTable.locationId, selected.id)).orderBy(asc(chairsTable.position)),
      tx
        .select()
        .from(openingHours)
        .where(
          and(
            eq(openingHours.locationId, selected.id),
            sql`${openingHours.validFrom} <= ${today}`,
            or(isNull(openingHours.validTo), gte(openingHours.validTo, today)),
          ),
        ),
      tx
        .select()
        .from(openingExceptions)
        .where(and(eq(openingExceptions.locationId, selected.id), gte(openingExceptions.day, today)))
        .orderBy(asc(openingExceptions.day))
        .limit(50),
    ]);
    return { locs, selected, chairRows, hourRows, exceptionRows };
  });

  const canAudit = actor.permissions.includes("audit.read");
  const history =
    tab === "historia" && canAudit
      ? await getDb().withActor(actor, (tx) =>
          tx
            .select({
              id: auditEvents.id,
              occurredAt: auditEvents.occurredAt,
              actorRole: auditEvents.actorRole,
              tableName: auditEvents.tableName,
              action: auditEvents.action,
              reason: auditEvents.reason,
            })
            .from(auditEvents)
            .where(and(eq(auditEvents.tenantId, actor.tenantId), inArray(auditEvents.tableName, ORG_TABLES)))
            .orderBy(desc(auditEvents.occurredAt))
            .limit(50),
        )
      : [];

  const tabLink = (id: string, label: string, active: boolean) => (
    <Link
      href={`/ustawienia/organizacja?tab=${id}`}
      aria-current={active ? "page" : undefined}
      className={`rounded-[var(--radius-pelne)] border px-4 py-1.5 text-sm font-semibold ${active ? "border-[var(--zenit-zielen)] bg-[var(--zenit-zielen)] text-[var(--zenit-kosc)]" : "border-[var(--border)]"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{L.org.title}</h1>
      <nav className="flex gap-2" aria-label={L.org.title}>
        {tabLink("gabinety", L.org.tabs.locations, tab === "gabinety")}
        {tabLink("historia", L.org.tabs.history, tab === "historia")}
      </nav>

      {tab === "historia" ? (
        <Card>
          <CardHeader title={L.org.history} />
          {!canAudit ? (
            <p className="text-sm text-[var(--text-muted)]">{L.org.historyForbidden}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{L.org.historyNone}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--text-muted)]">
                  <th>{L.org.historyCols.when}</th>
                  <th>{L.org.historyCols.who}</th>
                  <th>{L.org.historyCols.table}</th>
                  <th>{L.org.historyCols.action}</th>
                  <th>{L.org.historyCols.reason}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="tabular-nums">{formatDateTimePl(h.occurredAt)}</td>
                    <td>{h.actorRole ?? L.none}</td>
                    <td>{h.tableName}</td>
                    <td>{h.action}</td>
                    <td>{h.reason ?? L.none}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" data-testid="locations-list">
            {data.locs.length === 0 ? <p className="text-sm text-[var(--text-muted)]">{L.org.noLocations}</p> : null}
            {data.locs.map((l) => (
              <Link key={l.id} href={`/ustawienia/organizacja?gabinet=${l.id}`}>
                <LocationChip code={l.number} name={`${l.name}${l.active ? "" : ` (${L.org.inactive})`}`} active={l.id === data.selected?.id} />
              </Link>
            ))}
          </div>

          {data.selected ? (
            <>
              <Card>
                <CardHeader title={L.org.editLocation} />
                <LocationForm
                  key={data.selected.id + String(data.selected.updatedAt?.getTime() ?? 0)}
                  value={toFormValue(data.selected)}
                />
              </Card>
              <Card>
                <CardHeader title={L.org.chairs} />
                <ChairsList
                  chairs={data.chairRows.map((c) => ({
                    id: c.id,
                    name: c.name,
                    position: c.position,
                    equipment: c.equipment,
                    active: c.active,
                  }))}
                />
                <div className="mt-6">
                  <AddChairForm
                    key={data.chairRows.length}
                    locationId={data.selected.id}
                    nextPosition={Math.max(0, ...data.chairRows.map((c) => c.position)) + 1}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader title={L.org.hours} />
                <HoursForm
                  key={`${data.selected.id}-${String(data.hourRows.length)}`}
                  locationId={data.selected.id}
                  today={today}
                  hours={weekly(data.hourRows)}
                />
              </Card>
              <Card>
                <CardHeader title={L.org.exceptions} />
                {data.exceptionRows.length === 0 ? (
                  <p className="mb-4 text-sm text-[var(--text-muted)]">{L.org.exceptionNone}</p>
                ) : (
                  <ul className="mb-4 divide-y divide-[var(--border)] text-sm">
                    {data.exceptionRows.map((e) => (
                      <li key={e.id} className="flex gap-4 py-2">
                        <span className="tabular-nums">{e.day}</span>
                        <span>{e.closed ? L.org.closed : `${(e.opens ?? "").slice(0, 5)}–${(e.closes ?? "").slice(0, 5)}`}</span>
                        <span className="text-[var(--text-muted)]">{e.reason ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ExceptionForm locationId={data.selected.id} />
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader title={L.org.newLocation} />
            <LocationForm />
          </Card>
        </>
      )}
    </div>
  );
}

function toFormValue(l: {
  id: string;
  number: string;
  name: string;
  address: Record<string, unknown>;
  phone: string | null;
  email: string | null;
  colorKey: string;
  openedOn: string | null;
  active: boolean;
}): LocationFormValue {
  return {
    id: l.id,
    number: l.number,
    name: l.name,
    street: asText(l.address["street"]),
    city: asText(l.address["city"]),
    postcode: asText(l.address["postcode"]),
    phone: l.phone ?? "",
    email: l.email ?? "",
    colorKey: COLOR_ALIAS[l.colorKey] ?? l.colorKey,
    openedOn: l.openedOn ?? "",
    active: l.active,
  };
}

function weekly(rows: Array<{ weekday: number; opens: string; closes: string }>): HoursValue {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const r = rows.find((x) => x.weekday === d);
    return r ? { opens: r.opens.slice(0, 5), closes: r.closes.slice(0, 5) } : null;
  });
}
