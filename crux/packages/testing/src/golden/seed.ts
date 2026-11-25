import type { Actor, CruxDb, Tx } from "@crux/db";
import {
  chairOccupancy,
  chairs,
  locations,
  occupancyDayClosures,
  staffMembers,
  tenants,
  timeBlocks,
} from "@crux/db/schema";
import { assignMembership } from "@crux/identity";
import { setOpeningHours } from "@crux/org";
import type { KeyProvider } from "@crux/shared/crypto";
import { hourRange, plainDate } from "@crux/shared/time";
import { ADMIN_PERMISSIONS } from "../factories/bootstrap";
import { GOLDEN_OPENING_VALID_FROM, GOLDEN_OPERATOR_ID, GOLDEN_START } from "./constants";
import type { GoldenDataset } from "./dataset";
import { resetBetweenTests } from "@crux/db/testing";

const CHUNK = 500;

/** Aktor operatora seedu: pełne uprawnienia administracyjne w obu gabinetach golden. */
export function goldenActor(dataset: GoldenDataset): Actor {
  const ids = dataset.locations.map((l) => l.id);
  return {
    staffId: GOLDEN_OPERATOR_ID,
    tenantId: dataset.tenant.id,
    locationIds: ids,
    activeLocationId: ids[0] ?? GOLDEN_OPERATOR_ID,
    role: "network_admin",
    permissions: ADMIN_PERMISSIONS,
  };
}

function chunks<T>(rows: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

export type SeedSummary = {
  tenantId: string;
  locations: Array<{ number: string; id: string; chairs: number }>;
  staff: number;
  entries: number;
  timeBlocks: number;
  dayClosures: number;
};

/**
 * Zapis golden w transakcji `withActor` (RLS obowiązuje).
 * Struktura (tenant, gabinety, fotele, personel) — stałe UUID; wpisy obłożenia,
 * blokady i zamknięcia dni — masowe INSERT-y (bez zdarzeń outbox: to dane startowe).
 */
export async function seedGolden(
  tx: Tx,
  actor: Actor,
  dataset: GoldenDataset,
  keys: KeyProvider,
  opts: { tenantName?: string } = {},
): Promise<SeedSummary> {
  const tenantId = dataset.tenant.id;
  await tx.insert(tenants).values({
    id: tenantId,
    name: opts.tenantName ?? dataset.tenant.name,
    legalName: `${opts.tenantName ?? dataset.tenant.name} sp. z o.o. (dane syntetyczne)`,
    dekKeyId: await keys.currentKeyId(tenantId),
  });

  await tx.insert(locations).values(
    dataset.locations.map((l) => ({
      id: l.id,
      tenantId,
      number: l.number,
      name: l.name,
      address: l.address,
      colorKey: l.colorKey,
    })),
  );
  await tx.insert(chairs).values(
    dataset.locations.flatMap((l) =>
      l.chairs.map((c) => ({
        id: c.id,
        tenantId,
        locationId: l.id,
        name: c.name,
        position: c.position,
        equipment: c.equipment,
      })),
    ),
  );
  for (const l of dataset.locations) {
    for (const h of dataset.openingHours) {
      const r = await setOpeningHours(tx, actor, {
        locationId: l.id,
        validFrom: GOLDEN_OPENING_VALID_FROM,
        ...h,
      });
      if (!r.ok) throw new Error(`opening hours: ${JSON.stringify(r.error)}`);
    }
  }

  await tx.insert(staffMembers).values(
    dataset.staff.map((s) => ({
      id: s.id,
      tenantId,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      ...(s.title ? { title: s.title } : {}),
      ...(s.npwz ? { npwz: s.npwz } : {}),
    })),
  );
  const locByNumber = new Map(dataset.locations.map((l) => [l.number, l]));
  for (const s of dataset.staff) {
    for (const n of s.locationNumbers) {
      const loc = locByNumber.get(n);
      if (!loc) continue;
      const m = await assignMembership(tx, actor, {
        staffId: s.id,
        locationId: loc.id,
        role: s.role,
        startsOn: GOLDEN_START,
      });
      if (!m.ok) throw new Error(`membership: ${JSON.stringify(m.error)}`);
    }
  }

  const staffId = new Map(dataset.staff.map((s) => [s.key, s.id]));
  const chairId = (number: string, index: number): string => {
    const id = locByNumber.get(number)?.chairs[index]?.id;
    if (!id) throw new Error(`chair ${number}/${String(index)}`);
    return id;
  };

  // `hourRange` → `[a,b)`; blokada wielogodzinna = początek pierwszej … koniec ostatniej godziny.
  const bounds = (day: string, hour: number): [string, string] => {
    const [a, b] = hourRange(plainDate(day), hour).slice(1, -1).split(",");
    return [a ?? "", b ?? ""];
  };

  await tx.insert(timeBlocks).values(
    dataset.timeBlocks.map((b) => ({
      tenantId,
      locationId: locByNumber.get(b.locationNumber)?.id as string,
      chairId: chairId(b.locationNumber, b.chairIndex),
      period: `[${bounds(b.day, b.startHour)[0]},${bounds(b.day, b.endHour - 1)[1]})`,
      kind: b.kind,
      createdBy: actor.staffId,
    })),
  );

  for (const part of chunks(dataset.entries)) {
    await tx.insert(chairOccupancy).values(
      part.map((e) => ({
        tenantId,
        locationId: locByNumber.get(e.locationNumber)?.id as string,
        chairId: chairId(e.locationNumber, e.chairIndex),
        providerId: staffId.get(e.providerKey) as string,
        period: hourRange(plainDate(e.day), e.hour),
        category: e.category,
        amountGrosze: BigInt(e.amountGrosze),
        source: "manual" as const,
        createdBy: actor.staffId,
      })),
    );
  }

  for (const part of chunks(dataset.closures)) {
    await tx.insert(occupancyDayClosures).values(
      part.map((c) => ({
        tenantId,
        locationId: locByNumber.get(c.locationNumber)?.id as string,
        day: c.day,
        closedBy: actor.staffId,
        summary: {
          hours: c.hours,
          amount_grosze: c.amountGrosze,
          chairs_without_entries: c.chairsWithoutEntries,
        },
      })),
    );
  }

  return {
    tenantId,
    locations: dataset.locations.map((l) => ({ number: l.number, id: l.id, chairs: l.chairs.length })),
    staff: dataset.staff.length,
    entries: dataset.entries.length,
    timeBlocks: dataset.timeBlocks.length,
    dayClosures: dataset.closures.length,
  };
}

/** Reset fixtures (`tests.reset_fixtures`) + zapis golden. UWAGA: czyści całą bazę. */
export async function resetAndSeedGolden(
  db: CruxDb,
  dataset: GoldenDataset,
  keys: KeyProvider,
  opts: { tenantName?: string } = {},
): Promise<SeedSummary> {
  await resetBetweenTests(db);
  const actor = goldenActor(dataset);
  return db.withActor(actor, (tx) => seedGolden(tx, actor, dataset, keys, opts));
}
