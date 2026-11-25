import { locations as locationsTable, staffMembers } from "@crux/db/schema";
import { USTAWIENIA_LABELS } from "@crux/i18n";
import { and, eq, inArray } from "drizzle-orm";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { idleLockMs } from "@/server/env";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor();
  const db = getDb();

  const locs =
    actor.locationIds.length === 0
      ? []
      : await db.withActor(actor, async (tx) =>
          tx
            .select({
              id: locationsTable.id,
              number: locationsTable.number,
              name: locationsTable.name,
            })
            .from(locationsTable)
            .where(
              and(
                eq(locationsTable.tenantId, actor.tenantId),
                inArray(locationsTable.id, [...actor.locationIds]),
                eq(locationsTable.active, true),
              ),
            ),
        );

  const me = await db.withActor(actor, async (tx) =>
    tx
      .select({ first: staffMembers.firstName, last: staffMembers.lastName, display: staffMembers.displayName })
      .from(staffMembers)
      .where(and(eq(staffMembers.id, actor.staffId), eq(staffMembers.tenantId, actor.tenantId)))
      .limit(1),
  );
  const row = me[0];
  const staffName = row ? (row.display ?? `${row.first} ${row.last}`) : "Personel";
  const roles: Record<string, string> = USTAWIENIA_LABELS.staff.roles;
  const roleLabel = roles[actor.role] ?? actor.role;

  return (
    <AppShell
      locations={locs}
      activeLocationId={actor.activeLocationId}
      staffName={staffName}
      roleLabel={roleLabel}
      canManageIntegrations={actor.permissions.includes("integrations.manage")}
      idleLockMs={idleLockMs()}
    >
      {children}
    </AppShell>
  );
}
