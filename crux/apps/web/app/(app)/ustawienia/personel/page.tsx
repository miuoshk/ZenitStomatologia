import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import {
  locations as locationsTable,
  memberships,
  providerCapabilities,
  staffMembers,
} from "@crux/db/schema";
import { systemClock, toLocalDay } from "@crux/shared/time";
import { Card, CardHeader, StatusPill } from "@crux/ui";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { actorWith, NoAccess } from "@/features/settings/guard";
import { getDb } from "@/server/db";
import { AccountPanel, MembershipsPanel, StaffForm } from "./forms";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PersonelPage({ searchParams }: Props) {
  const actor = await actorWith("staff.manage");
  if (!actor) return <NoAccess />;
  const raw = await searchParams;
  const today = toLocalDay(systemClock.now());

  const { staff, members, locs, caps } = await getDb().withActor(actor, async (tx) => ({
    staff: await tx
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.tenantId, actor.tenantId))
      .orderBy(asc(staffMembers.lastName), asc(staffMembers.firstName)),
    members: await tx.select().from(memberships).where(eq(memberships.tenantId, actor.tenantId)),
    locs: await tx
      .select({ id: locationsTable.id, number: locationsTable.number, name: locationsTable.name })
      .from(locationsTable)
      .where(eq(locationsTable.tenantId, actor.tenantId))
      .orderBy(asc(locationsTable.number)),
    caps: await tx.select().from(providerCapabilities).where(eq(providerCapabilities.tenantId, actor.tenantId)),
  }));

  const locLabel = new Map(locs.map((l) => [l.id, `${l.number} ${l.name}`]));
  const selected = staff.find((s) => s.id === one(raw["pracownik"]));
  const isNew = one(raw["nowy"]) !== undefined || (!selected && staff.length === 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">{L.staff.title}</h1>
        <Link href="/ustawienia/personel?nowy" className="text-[var(--zenit-zielen)] underline-offset-2 hover:underline">
          + {L.staff.newStaff}
        </Link>
      </div>

      <Card>
        <CardHeader title={L.staff.list} />
        {staff.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{L.staff.none}</p>
        ) : (
          <table className="w-full text-left text-sm" data-testid="staff-table">
            <thead>
              <tr className="text-[var(--text-muted)]">
                <th className="py-2">{L.staff.cols.name}</th>
                <th>{L.staff.cols.roles}</th>
                <th>{L.staff.cols.account}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const open = members.filter((m) => m.staffId === s.id && (m.endsOn === null || m.endsOn >= today));
                return (
                  <tr key={s.id} className="border-t border-[var(--border)]">
                    <td className="py-2">
                      <Link href={`/ustawienia/personel?pracownik=${s.id}`} className="font-semibold hover:underline">
                        {s.firstName} {s.lastName}
                      </Link>
                      {s.title ? <span className="ml-2 text-[var(--text-muted)]">{s.title}</span> : null}
                    </td>
                    <td>
                      {open.length === 0
                        ? L.none
                        : open
                            .map(
                              (m) =>
                                `${(locLabel.get(m.locationId) ?? "").split(" ")[0] ?? ""}: ${L.staff.roles[m.role]}`,
                            )
                            .join(", ")}
                    </td>
                    <td>
                      {!s.active ? (
                        <StatusPill status="krytyczne">{L.staff.account.inactive}</StatusPill>
                      ) : s.authUserId ? (
                        <StatusPill status="dobrze">{L.staff.account.invited}</StatusPill>
                      ) : (
                        <StatusPill status="uwaga">{L.staff.account.noAccount}</StatusPill>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {selected ? (
        <>
          <Card>
            <CardHeader title={`${L.staff.edit}: ${selected.firstName} ${selected.lastName}`} />
            <StaffForm
              key={selected.id + String(selected.updatedAt?.getTime() ?? 0)}
              value={{
                id: selected.id,
                firstName: selected.firstName,
                lastName: selected.lastName,
                title: selected.title ?? "",
                email: selected.email,
                npwz: selected.npwz ?? "",
                colorKey: selected.colorKey ?? "",
                capabilities: caps.filter((c) => c.staffId === selected.id).map((c) => c.serviceCategory),
              }}
            />
          </Card>
          <Card>
            <CardHeader title={L.staff.memberships} />
            <MembershipsPanel
              staffId={selected.id}
              today={today}
              locations={locs.map((l) => ({ id: l.id, label: `${l.number} ${l.name}` }))}
              items={members
                .filter((m) => m.staffId === selected.id)
                .map((m) => ({
                  id: m.id,
                  locationLabel: locLabel.get(m.locationId) ?? m.locationId,
                  role: m.role,
                  startsOn: m.startsOn,
                  endsOn: m.endsOn,
                }))}
            />
          </Card>
          <Card>
            <CardHeader title={L.staff.cols.actions} />
            <AccountPanel staffId={selected.id} hasAccount={selected.authUserId !== null} active={selected.active} />
          </Card>
        </>
      ) : null}

      {isNew && !selected ? (
        <Card>
          <CardHeader title={L.staff.newStaff} />
          <StaffForm />
        </Card>
      ) : null}
    </div>
  );
}
