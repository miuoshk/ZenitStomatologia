import { locations as locationsTable } from "@crux/db/schema";
import { OCCUPANCY_LABELS } from "@crux/i18n";
import { getDayGrid } from "@crux/scheduling";
import { PlainDateSchema, plusMs, startOfDayIn, systemClock, toLocalDay } from "@crux/shared/time";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";
import { OccupancyGrid, type GridData } from "./occupancy-grid";

type Props = {
  searchParams: Promise<{ dzien?: string | string[]; gabinet?: string | string[] }>;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function OblozeniePage({ searchParams }: Props) {
  const actor = await requireActor();
  const params = await searchParams;
  const raw = Array.isArray(params.dzien) ? params.dzien[0] : params.dzien;
  const today = toLocalDay(systemClock.now());
  const day = raw && DAY_RE.test(raw) ? raw : today;

  const parsedDay = PlainDateSchema.safeParse(day);
  const startOfDay = parsedDay.success ? startOfDayIn("Europe/Warsaw", parsedDay.data) : null;
  // ±36 h od lokalnej północy trafia zawsze w sąsiedni dzień (także przy zmianie czasu).
  const prevDay = startOfDay ? toLocalDay(plusMs(startOfDay, -12 * 3_600_000)) : day;
  const nextDay = startOfDay ? toLocalDay(plusMs(startOfDay, 36 * 3_600_000)) : day;

  // `gabinet=<numer>` (link z karty „Jakość danych”): tylko gabinety z członkostwa aktora.
  const gabinet = Array.isArray(params.gabinet) ? params.gabinet[0] : params.gabinet;
  const result = await getDb().withActor(actor, async (tx) => {
    let locationId = actor.activeLocationId;
    if (gabinet && /^\d{1,3}$/.test(gabinet)) {
      const rows = await tx
        .select({ id: locationsTable.id })
        .from(locationsTable)
        .where(
          and(
            eq(locationsTable.tenantId, actor.tenantId),
            eq(locationsTable.number, gabinet),
            inArray(locationsTable.id, [...actor.locationIds]),
          ),
        )
        .limit(1);
      locationId = rows[0]?.id ?? locationId;
    }
    return getDayGrid(tx, actor, { locationIds: [locationId], day });
  });

  if (!result.ok) {
    return (
      <div>
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          {OCCUPANCY_LABELS.title}
        </h1>
        <p role="alert" className="mt-4 text-[var(--text-secondary)]">
          {result.error.type === "forbidden" ? "Brak uprawnień do podglądu obłożenia." : OCCUPANCY_LABELS.error}
        </p>
      </div>
    );
  }

  const loc = result.value.locations[0];
  const has = (p: string) => actor.permissions.includes(p);
  const data: GridData = {
    day: result.value.day,
    today,
    prevDay,
    nextDay,
    closedAllDay: loc?.closedAllDay ?? false,
    opens: loc?.opens ?? null,
    closes: loc?.closes ?? null,
    dayClosed: loc?.dayClosed ?? false,
    chairs: (loc?.chairs ?? []).map((c) => ({
      id: c.chairId,
      name: c.name,
      entries: c.entries.map((e) => ({
        id: e.id,
        hour: e.hour,
        category: e.category,
        amountGrosze: e.amountGrosze === null ? null : e.amountGrosze.toString(),
        note: e.note,
        source: e.source,
      })),
      blocks: c.blocks.map((b) => ({
        id: b.id,
        startHour: b.startHour,
        endHour: b.endHour,
        kind: b.kind,
      })),
    })),
    can: {
      write: has("occupancy.write") || has("occupancy.write_own"),
      void: has("occupancy.void"),
      close: has("occupancy.close_day"),
      reopen: has("occupancy.write_closed"),
      writeClosed: has("occupancy.write_closed"),
    },
  };

  return <OccupancyGrid key={data.day} data={data} />;
}
