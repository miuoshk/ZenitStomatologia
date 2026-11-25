import { locations as locationsTable } from "@crux/db/schema";
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

  return (
    <AppShell
      locations={locs}
      activeLocationId={actor.activeLocationId}
      staffLabel={actor.role}
      canNetworkView={actor.permissions.includes("network.view")}
      canManageIntegrations={actor.permissions.includes("integrations.manage")}
      idleLockMs={idleLockMs()}
    >
      {children}
    </AppShell>
  );
}
