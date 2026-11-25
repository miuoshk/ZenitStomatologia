import type { Actor, Tx } from "@crux/db";
import { authorize } from "@crux/identity";
import { ok, type DomainError, type Result } from "@crux/shared/result";
import { TZ, PlainDateSchema } from "@crux/shared/time";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { OccupancyCategory, OccupancySource } from "../domain/chair-occupancy";
import { parseInput, rowsOf, toInstant } from "./common";

export const GetDayGridInput = z.object({
  locationIds: z.array(z.uuid()).min(1),
  day: PlainDateSchema,
});
export type GetDayGridInput = z.input<typeof GetDayGridInput>;

export type DayGridEntry = {
  id: string;
  hour: number;
  category: OccupancyCategory;
  amountGrosze: bigint | null;
  providerId: string | null;
  note: string | null;
  source: OccupancySource;
  overrideReason: string | null;
};

export type DayGridBlock = {
  id: string;
  startHour: number;
  endHour: number;
  kind: string;
  note: string | null;
  staffId: string | null;
};

export type DayGridChair = {
  chairId: string;
  name: string;
  position: number;
  entries: DayGridEntry[];
  blocks: DayGridBlock[];
};

export type DayGridLocation = {
  locationId: string;
  /** Gabinet zamknięty w tym dniu wg godzin otwarcia / wyjątków. */
  closedAllDay: boolean;
  opens: string | null;
  closes: string | null;
  dayClosed: boolean;
  dayClosedAt: Date | null;
  chairs: DayGridChair[];
};

type GridRow = {
  location_id: string;
  chair_id: string | null;
  chair_name: string | null;
  position: number | null;
  loc_closed: boolean;
  opens: string | null;
  closes: string | null;
  closure_closed_at: string | Date | null;
  entries: Array<{
    id: string;
    hour: number;
    category: OccupancyCategory;
    amountGrosze: string | null;
    providerId: string | null;
    note: string | null;
    source: OccupancySource;
    overrideReason: string | null;
  }>;
  blocks: DayGridBlock[];
};

/**
 * Siatka dnia — jedno zapytanie: gabinety × fotele × godziny otwarcia ×
 * wpisy (bez anulowanych) × blokady × status zamknięcia. [F0-010/AC10]
 */
export async function getDayGrid(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
): Promise<Result<{ day: string; locations: DayGridLocation[] }, DomainError>> {
  const parsed = parseInput(GetDayGridInput, rawInput);
  if (!parsed.ok) return parsed;
  const { locationIds, day } = parsed.value;

  for (const locationId of locationIds) {
    const authz = await authorize(tx, actor, "occupancy.read", { locationId });
    if (!authz.ok) return authz;
  }

  const ids = sql.join(
    locationIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  const result = await tx.execute(sql`
    with d as (
      select ${day}::date as day,
             (${day}::date)::timestamp at time zone ${TZ}::text as s,
             ((${day}::date) + 1)::timestamp at time zone ${TZ}::text as e
    )
    select
      l.id as location_id,
      c.id as chair_id,
      c.name as chair_name,
      c.position,
      oh.closed as loc_closed,
      oh.opens::text as opens,
      oh.closes::text as closes,
      cl.closed_at as closure_closed_at,
      coalesce(ents.items, '[]'::jsonb) as entries,
      coalesce(blks.items, '[]'::jsonb) as blocks
    from org.locations l
    cross join d
    left join org.chairs c
      on c.location_id = l.id and c.tenant_id = l.tenant_id and c.active
    left join lateral (
      select
        case when ex.id is not null then ex.closed else h.id is null end as closed,
        case when ex.id is not null then ex.opens else h.opens end as opens,
        case when ex.id is not null then ex.closes else h.closes end as closes
      from (select 1) x
      left join org.opening_exceptions ex
        on ex.location_id = l.id and ex.day = d.day
      left join lateral (
        select o.id, o.opens, o.closes
        from org.opening_hours o
        where o.location_id = l.id
          and o.weekday = extract(isodow from d.day)::int
          and o.valid_from <= d.day
          and (o.valid_to is null or o.valid_to >= d.day)
        limit 1
      ) h on true
    ) oh on true
    left join scheduling.occupancy_day_closures cl
      on cl.location_id = l.id and cl.day = d.day and cl.reopened_at is null
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'hour', extract(hour from lower(e.period) at time zone ${TZ}::text)::int,
        'category', e.category,
        'amountGrosze', e.amount_grosze::text,
        'providerId', e.provider_id,
        'note', e.note,
        'source', e.source::text,
        'overrideReason', e.override_reason
      ) order by lower(e.period)) as items
      from scheduling.chair_occupancy e
      where e.chair_id = c.id
        and e.voided_at is null
        and e.period && tstzrange(d.s, d.e)
    ) ents on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'startHour', case when lower(b.period) < d.s then 0
          else extract(hour from lower(b.period) at time zone ${TZ}::text)::int end,
        'endHour', case when upper(b.period) >= d.e then 24
          else extract(hour from upper(b.period) at time zone ${TZ}::text)::int end,
        'kind', b.kind,
        'note', b.note,
        'staffId', b.staff_id
      ) order by lower(b.period)) as items
      from scheduling.time_blocks b
      where b.ended_at is null
        and b.chair_id = c.id
        and b.period && tstzrange(d.s, d.e)
    ) blks on true
    where l.tenant_id = ${actor.tenantId}::uuid
      and l.id = any (array[${ids}])
    order by l.number, c.position
  `);

  const byLocation = new Map<string, DayGridLocation>();
  for (const row of rowsOf<GridRow>(result)) {
    let loc = byLocation.get(row.location_id);
    if (!loc) {
      loc = {
        locationId: row.location_id,
        closedAllDay: row.loc_closed,
        opens: row.opens,
        closes: row.closes,
        dayClosed: row.closure_closed_at !== null,
        dayClosedAt: row.closure_closed_at === null ? null : toInstant(row.closure_closed_at),
        chairs: [],
      };
      byLocation.set(row.location_id, loc);
    }
    if (row.chair_id) {
      loc.chairs.push({
        chairId: row.chair_id,
        name: row.chair_name ?? "",
        position: row.position ?? 0,
        entries: row.entries.map((e) => ({
          ...e,
          hour: e.hour,
          amountGrosze: e.amountGrosze === null ? null : BigInt(e.amountGrosze),
        })),
        blocks: row.blocks.map((b) => ({
          ...b,
          startHour: b.startHour,
          endHour: b.endHour,
        })),
      });
    }
  }

  return ok({ day, locations: [...byLocation.values()] });
}

export const GetWeekSummaryInput = z.object({
  locationId: z.uuid(),
  /** Pierwszy dzień tygodnia (zwykle poniedziałek); zwracane jest 7 dni. */
  weekStart: PlainDateSchema,
});
export type GetWeekSummaryInput = z.input<typeof GetWeekSummaryInput>;

export type WeekDaySummary = {
  day: string;
  hours: number;
  amountGrosze: bigint;
  closed: boolean;
};

export async function getWeekSummary(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
): Promise<Result<{ days: WeekDaySummary[] }, DomainError>> {
  const parsed = parseInput(GetWeekSummaryInput, rawInput);
  if (!parsed.ok) return parsed;
  const { locationId, weekStart } = parsed.value;

  const authz = await authorize(tx, actor, "occupancy.read", { locationId });
  if (!authz.ok) return authz;

  const result = await tx.execute(sql`
    with d as (
      select g::date as day
      from generate_series(${weekStart}::date, (${weekStart}::date) + 6, interval '1 day') g
    )
    select
      d.day::text as day,
      coalesce(agg.hours, 0)::int as hours,
      coalesce(agg.amount, 0)::text as amount,
      (cl.id is not null) as closed
    from d
    left join lateral (
      select count(*) as hours, sum(coalesce(e.amount_grosze, 0)) as amount
      from scheduling.chair_occupancy e
      where e.tenant_id = ${actor.tenantId}::uuid
        and e.location_id = ${locationId}::uuid
        and e.voided_at is null
        and e.period && tstzrange(
          d.day::timestamp at time zone ${TZ}::text,
          (d.day + 1)::timestamp at time zone ${TZ}::text
        )
    ) agg on true
    left join scheduling.occupancy_day_closures cl
      on cl.location_id = ${locationId}::uuid and cl.day = d.day and cl.reopened_at is null
    order by d.day
  `);

  const days = rowsOf<{ day: string; hours: number; amount: string; closed: boolean }>(result).map(
    (r) => ({
      day: r.day,
      hours: r.hours,
      amountGrosze: BigInt(r.amount),
      closed: r.closed,
    }),
  );
  return ok({ days });
}

export const ListOccupancyInput = z.object({
  locationId: z.uuid(),
  from: PlainDateSchema,
  /** Włącznie. */
  to: PlainDateSchema,
  chairId: z.uuid().optional(),
  providerId: z.uuid().optional(),
  includeVoided: z.boolean().default(false),
  limit: z.number().int().min(1).max(5000).default(1000),
});
export type ListOccupancyInput = z.input<typeof ListOccupancyInput>;

export type OccupancyListItem = {
  id: string;
  chairId: string;
  providerId: string | null;
  day: string;
  hour: number;
  category: OccupancyCategory;
  amountGrosze: bigint | null;
  source: OccupancySource;
  note: string | null;
  overrideReason: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
};

export async function listOccupancy(
  tx: Tx,
  actor: Actor,
  rawInput: unknown,
): Promise<Result<OccupancyListItem[], DomainError>> {
  const parsed = parseInput(ListOccupancyInput, rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  const authz = await authorize(tx, actor, "occupancy.read", { locationId: input.locationId });
  if (!authz.ok) return authz;

  const result = await tx.execute(sql`
    select
      e.id,
      e.chair_id,
      e.provider_id,
      to_char(lower(e.period) at time zone ${TZ}::text, 'YYYY-MM-DD') as day,
      extract(hour from lower(e.period) at time zone ${TZ}::text)::int as hour,
      e.category,
      e.amount_grosze::text as amount,
      e.source::text as source,
      e.note,
      e.override_reason,
      e.voided_at,
      e.void_reason
    from scheduling.chair_occupancy e
    where e.tenant_id = ${actor.tenantId}::uuid
      and e.location_id = ${input.locationId}::uuid
      and e.period && tstzrange(
        (${input.from}::date)::timestamp at time zone ${TZ}::text,
        ((${input.to}::date) + 1)::timestamp at time zone ${TZ}::text
      )
      ${input.includeVoided ? sql`` : sql`and e.voided_at is null`}
      ${input.chairId ? sql`and e.chair_id = ${input.chairId}::uuid` : sql``}
      ${input.providerId ? sql`and e.provider_id = ${input.providerId}::uuid` : sql``}
    order by lower(e.period), e.chair_id
    limit ${input.limit}
  `);

  type Row = {
    id: string;
    chair_id: string;
    provider_id: string | null;
    day: string;
    hour: number;
    category: OccupancyCategory;
    amount: string | null;
    source: OccupancySource;
    note: string | null;
    override_reason: string | null;
    voided_at: string | Date | null;
    void_reason: string | null;
  };

  return ok(
    rowsOf<Row>(result).map((r) => ({
      id: r.id,
      chairId: r.chair_id,
      providerId: r.provider_id,
      day: r.day,
      hour: r.hour,
      category: r.category,
      amountGrosze: r.amount === null ? null : BigInt(r.amount),
      source: r.source,
      note: r.note,
      overrideReason: r.override_reason,
      voidedAt: r.voided_at === null ? null : toInstant(r.voided_at),
      voidReason: r.void_reason,
    })),
  );
}
