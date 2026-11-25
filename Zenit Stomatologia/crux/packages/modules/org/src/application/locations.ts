import type { Actor, Tx } from "@crux/db";
import { chairs, locations, openingExceptions, openingHours } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { plainDate } from "@crux/shared/time";
import { and, eq, sql } from "drizzle-orm";
import { authorize } from "@crux/identity";

/** `01`–`04` wg docs/14 (kolor gabinetu = numer); `loc1`–`loc4` zostają dla zgodności wstecznej. */
export const COLOR_POOL = ["01", "02", "03", "04", "loc1", "loc2", "loc3", "loc4"] as const;
const NUMBER_RE = /^\d{2}$/;

export async function createLocation(
  tx: Tx,
  actor: Actor,
  input: {
    number: string;
    name: string;
    address: Record<string, unknown>;
    colorKey?: (typeof COLOR_POOL)[number];
    phone?: string;
    email?: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  if (!NUMBER_RE.test(input.number)) {
    return err({ type: "validation", details: { field: "number", code: "format_dd" } });
  }

  const existing = await tx
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.tenantId, actor.tenantId), eq(locations.number, input.number)))
    .limit(1);
  if (existing[0]) {
    return err({ type: "conflict", details: { constraint: "locations_tenant_number" } });
  }

  const used = await tx
    .select({ colorKey: locations.colorKey })
    .from(locations)
    .where(eq(locations.tenantId, actor.tenantId));
  const usedKeys = new Set(used.map((u) => u.colorKey));
  const colorKey =
    input.colorKey ?? COLOR_POOL.find((k) => !usedKeys.has(k)) ?? COLOR_POOL[0];

  const rows = await tx
    .insert(locations)
    .values({
      tenantId: actor.tenantId,
      number: input.number,
      name: input.name,
      address: input.address,
      colorKey,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.email ? { email: input.email } : {}),
    })
    .returning({ id: locations.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "location_insert" } });
  return ok({ id });
}

export async function updateLocation(
  tx: Tx,
  actor: Actor,
  locationId: string,
  patch: {
    name?: string;
    phone?: string;
    email?: string;
    active?: boolean;
    address?: Record<string, unknown>;
    colorKey?: (typeof COLOR_POOL)[number];
    openedOn?: string | null;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  await tx
    .update(locations)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.colorKey !== undefined ? { colorKey: patch.colorKey } : {}),
      ...(patch.openedOn !== undefined ? { openedOn: patch.openedOn } : {}),
      updatedAt: sql`now()`,
      updatedBy: actor.staffId,
    })
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, actor.tenantId)));

  return ok({ id: locationId });
}

export async function createChair(
  tx: Tx,
  actor: Actor,
  input: {
    locationId: string;
    name: string;
    position: number;
    equipment?: string[];
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  const rows = await tx
    .insert(chairs)
    .values({
      tenantId: actor.tenantId,
      locationId: input.locationId,
      name: input.name,
      position: input.position,
      equipment: input.equipment ?? [],
    })
    .returning({ id: chairs.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "chair_insert" } });
  return ok({ id });
}

export async function updateChair(
  tx: Tx,
  actor: Actor,
  chairId: string,
  patch: {
    name?: string;
    position?: number;
    equipment?: string[];
    active?: boolean;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  await tx
    .update(chairs)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.equipment !== undefined ? { equipment: patch.equipment } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      updatedAt: sql`now()`,
      updatedBy: actor.staffId,
    })
    .where(and(eq(chairs.id, chairId), eq(chairs.tenantId, actor.tenantId)));

  return ok({ id: chairId });
}

export async function setOpeningHours(
  tx: Tx,
  actor: Actor,
  input: {
    locationId: string;
    weekday: number;
    opens: string;
    closes: string;
    validFrom: string;
    validTo?: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  const rows = await tx
    .insert(openingHours)
    .values({
      tenantId: actor.tenantId,
      locationId: input.locationId,
      weekday: input.weekday,
      opens: input.opens,
      closes: input.closes,
      validFrom: plainDate(input.validFrom),
      ...(input.validTo ? { validTo: plainDate(input.validTo) } : {}),
    })
    .returning({ id: openingHours.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "opening_hours_insert" } });
  return ok({ id });
}

export async function setOpeningException(
  tx: Tx,
  actor: Actor,
  input: {
    locationId: string;
    day: string;
    closed?: boolean;
    opens?: string;
    closes?: string;
    reason?: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  const rows = await tx
    .insert(openingExceptions)
    .values({
      tenantId: actor.tenantId,
      locationId: input.locationId,
      day: plainDate(input.day),
      closed: input.closed ?? false,
      ...(input.opens ? { opens: input.opens } : {}),
      ...(input.closes ? { closes: input.closes } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
    })
    .returning({ id: openingExceptions.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "opening_exception_insert" } });
  return ok({ id });
}

/**
 * Tygodniowy plan godzin: zamyka (validTo) obowiązujące wiersze zmienionych dni i dodaje nowe od `validFrom`.
 * `hours[weekday]` = null → dzień zamknięty. Niezmienione dni zostają bez ruchu.
 */
export async function replaceWeeklyHours(
  tx: Tx,
  actor: Actor,
  input: {
    locationId: string;
    validFrom: string;
    hours: ReadonlyArray<{ weekday: number; opens: string; closes: string } | null>;
  },
): Promise<Result<{ changed: number }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;

  const from = plainDate(input.validFrom);
  let changed = 0;
  for (const [index, day] of input.hours.entries()) {
    const weekday = index + 1;
    if (day && day.opens >= day.closes) {
      return err({ type: "validation", details: { field: `hours.${String(weekday)}`, code: "opens_before_closes" } });
    }
    const current = await tx
      .select()
      .from(openingHours)
      .where(
        and(
          eq(openingHours.tenantId, actor.tenantId),
          eq(openingHours.locationId, input.locationId),
          eq(openingHours.weekday, weekday),
          sql`(${openingHours.validTo} is null or ${openingHours.validTo} >= ${from})`,
        ),
      );
    const same =
      day !== null &&
      current.length === 1 &&
      current[0]?.validTo === null &&
      current[0].opens.slice(0, 5) === day.opens.slice(0, 5) &&
      current[0].closes.slice(0, 5) === day.closes.slice(0, 5);
    if (same || (day === null && current.length === 0)) continue;

    for (const row of current) {
      await tx
        .update(openingHours)
        .set({
          validTo:
            row.validFrom < from
              ? sql`(${from}::date - 1)`
              : sql`(${openingHours.validFrom} - 1)`,
        })
        .where(eq(openingHours.id, row.id));
    }
    if (day) {
      await tx.insert(openingHours).values({
        tenantId: actor.tenantId,
        locationId: input.locationId,
        weekday,
        opens: day.opens,
        closes: day.closes,
        validFrom: from,
      });
    }
    changed += 1;
  }
  return ok({ changed });
}

/** Wyjątek godzin otwarcia dla dnia — upsert po (location, day). */
export async function upsertOpeningException(
  tx: Tx,
  actor: Actor,
  input: {
    locationId: string;
    day: string;
    closed: boolean;
    opens?: string;
    closes?: string;
    reason?: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "org.manage");
  if (!authz.ok) return authz;
  if (!input.closed && (!input.opens || !input.closes || input.opens >= input.closes)) {
    return err({ type: "validation", details: { field: "opens", code: "opens_before_closes" } });
  }
  const day = plainDate(input.day);
  const existing = await tx
    .select({ id: openingExceptions.id })
    .from(openingExceptions)
    .where(
      and(
        eq(openingExceptions.tenantId, actor.tenantId),
        eq(openingExceptions.locationId, input.locationId),
        eq(openingExceptions.day, day),
      ),
    )
    .limit(1);
  const values = {
    closed: input.closed,
    opens: input.closed ? null : (input.opens ?? null),
    closes: input.closed ? null : (input.closes ?? null),
    reason: input.reason ?? null,
  };
  if (existing[0]) {
    await tx.update(openingExceptions).set(values).where(eq(openingExceptions.id, existing[0].id));
    return ok({ id: existing[0].id });
  }
  const rows = await tx
    .insert(openingExceptions)
    .values({ tenantId: actor.tenantId, locationId: input.locationId, day, ...values })
    .returning({ id: openingExceptions.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "opening_exception_insert" } });
  return ok({ id });
}

export async function listLocations(
  tx: Tx,
  actor: Actor,
): Promise<Result<Array<{ id: string; number: string; name: string }>, DomainError>> {
  const rows = await tx
    .select({
      id: locations.id,
      number: locations.number,
      name: locations.name,
    })
    .from(locations)
    .where(eq(locations.tenantId, actor.tenantId));
  return ok(rows);
}

export async function listChairs(
  tx: Tx,
  actor: Actor,
  locationId: string,
): Promise<Result<Array<{ id: string; name: string; position: number }>, DomainError>> {
  const rows = await tx
    .select({
      id: chairs.id,
      name: chairs.name,
      position: chairs.position,
    })
    .from(chairs)
    .where(and(eq(chairs.tenantId, actor.tenantId), eq(chairs.locationId, locationId)));
  return ok(rows);
}

export async function getOpeningHours(
  tx: Tx,
  actor: Actor,
  locationId: string,
  day: string,
): Promise<
  Result<{ closed: boolean; opens: string | null; closes: string | null }, DomainError>
> {
  const d = plainDate(day);
  const exception = await tx
    .select()
    .from(openingExceptions)
    .where(
      and(
        eq(openingExceptions.tenantId, actor.tenantId),
        eq(openingExceptions.locationId, locationId),
        eq(openingExceptions.day, d),
      ),
    )
    .limit(1);

  if (exception[0]) {
    const e = exception[0];
    return ok({
      closed: e.closed,
      opens: e.opens,
      closes: e.closes,
    });
  }

  // ISO weekday: Monday=1 … Sunday=7 (Postgres extract isodow)
  const weekdayRows = await tx.execute(sql`
    select extract(isodow from ${d}::date)::int as weekday
  `);
  const weekday = (weekdayRows[0] as { weekday: number } | undefined)?.weekday;
  if (!weekday) {
    return err({ type: "invariant", details: { code: "weekday" } });
  }

  const hours = await tx
    .select()
    .from(openingHours)
    .where(
      and(
        eq(openingHours.tenantId, actor.tenantId),
        eq(openingHours.locationId, locationId),
        eq(openingHours.weekday, weekday),
        sql`${openingHours.validFrom} <= ${d}`,
        sql`(${openingHours.validTo} is null or ${openingHours.validTo} >= ${d})`,
      ),
    )
    .limit(1);

  const h = hours[0];
  if (!h) return ok({ closed: true, opens: null, closes: null });
  return ok({ closed: false, opens: h.opens, closes: h.closes });
}
