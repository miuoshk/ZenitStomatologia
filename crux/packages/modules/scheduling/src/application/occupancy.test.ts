import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor, CruxDb } from "@crux/db";
import { auditEvents, chairOccupancy, outbox } from "@crux/db/schema";
import { createTestDb, resetBetweenTests } from "@crux/db/testing";
import { setSetting } from "@crux/platform";
import {
  bootstrapTenant,
  chairFactory,
  createFakeKeyProvider,
  createRng,
  locationFactory,
  openingHoursFactory,
  persistChair,
  persistLocation,
  persistOpeningHours,
  persistStaff,
  staffFactory,
} from "@crux/testing";
import { newId } from "@crux/shared/id";
import type { Result } from "@crux/shared/result";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  closeDay,
  copyDayFrom,
  createTimeBlock,
  endTimeBlock,
  getDayGrid,
  getWeekSummary,
  listOccupancy,
  recordOccupancy,
  recordOccupancyRange,
  reopenDay,
  voidOccupancy,
} from "../index";

const DAY = "2027-03-10"; // środa
const NEXT_DAY = "2027-03-11";

type Fx = {
  tenantA: string;
  location01: string;
  location02: string;
  staff: Record<"reception" | "manager" | "dentist" | "assistant", string>;
};

type Env = {
  f: Fx;
  chairs: string[];
  admin: Actor;
  reception: Actor;
  manager: Actor;
  provider: Actor;
};

describe("@crux/scheduling occupancy (integracja)", () => {
  let db: CruxDb;
  let env: Env;

  beforeAll(() => {
    db = createTestDb("app");
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetBetweenTests(db);
    const { tenantId, admin } = await bootstrapTenant(db, createFakeKeyProvider());
    const must = <T>(r: Result<T, unknown>, what: string): T => {
      if (!r.ok) throw new Error(`${what} ${JSON.stringify(r.error)}`);
      return r.value;
    };

    const chairs: string[] = [];
    const ids = {} as Fx["staff"];
    let location01 = "";
    let location02 = "";
    await db.withActor(admin, async (tx) => {
      location01 = must(await persistLocation(tx, admin, locationFactory("01")), "location").id;
      location02 = must(await persistLocation(tx, admin, locationFactory("02")), "location").id;
      for (let i = 1; i <= 3; i += 1) {
        chairs.push(must(await persistChair(tx, admin, location01, chairFactory(i)), "chair").id);
      }
      // test potrzebuje także niedzieli (domyślna fabryka: niedziela zamknięta)
      await persistOpeningHours(
        tx,
        admin,
        location01,
        "2020-01-01",
        openingHoursFactory({ 6: { weekday: 6, opens: "08:00", closes: "20:00" }, 7: { weekday: 7, opens: "08:00", closes: "20:00" } }),
      );
      const rng = createRng(12);
      for (const key of ["reception", "manager", "dentist", "assistant"] as const) {
        ids[key] = must(
          await persistStaff(tx, admin, staffFactory(rng, key, "assistant")),
          "staff",
        ).id;
      }
    });

    const f: Fx = { tenantA: tenantId, location01, location02, staff: ids };
    const actor = (
      key: keyof Fx["staff"],
      role: string,
      permissions: string[],
      locationIds: string[] = [location01],
    ): Actor => ({
      staffId: ids[key],
      tenantId,
      locationIds,
      activeLocationId: location01,
      role,
      permissions,
    });

    const reception = actor("reception", "receptionist", [
      "occupancy.read",
      "occupancy.write",
      "occupancy.void",
      "occupancy.close_day",
    ]);
    const manager = actor(
      "manager",
      "location_manager",
      [
        "occupancy.read",
        "occupancy.write",
        "occupancy.void",
        "occupancy.close_day",
        "occupancy.write_closed",
        "occupancy.override_hours",
      ],
      [location01, location02],
    );
    const provider = actor("dentist", "dentist", ["occupancy.read", "occupancy.write_own"]);
    env = { f, chairs, admin, reception, manager, provider };
  });

  const chair = (i: number): string => {
    const id = env.chairs[i];
    if (!id) throw new Error("chair");
    return id;
  };

  function base(over: Record<string, unknown> = {}) {
    return {
      commandId: newId(),
      locationId: env.f.location01,
      chairId: chair(1),
      day: DAY,
      hour: 10,
      category: "Z3",
      amountGrosze: 45000n,
      providerId: env.f.staff.dentist,
      ...over,
    };
  }

  it("[F0-010/AC1] zapis: okres lokalny, kwota, source=manual, audyt i zdarzenie z chairId", async () => {
    const r = await db.withActor(env.reception, (tx) => recordOccupancy(tx, env.reception, base()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const auditor: Actor = { ...env.reception, permissions: ["audit.read"] };
    await db.withActor(auditor, async (tx) => {
      const audit = await tx
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.rowId, r.value.entryId));
      expect(audit.length).toBeGreaterThan(0);
    });

    await db.withActor(env.reception, async (tx) => {
      const rows = await tx
        .select({
          amount: chairOccupancy.amountGrosze,
          source: chairOccupancy.source,
          period: sql<string>`${chairOccupancy.period}::text`,
          local: sql<string>`to_char(lower(${chairOccupancy.period}) at time zone 'Europe/Warsaw', 'HH24:MI')`,
        })
        .from(chairOccupancy)
        .where(eq(chairOccupancy.id, r.value.entryId));
      expect(rows[0]?.amount).toBe(45000n);
      expect(rows[0]?.source).toBe("manual");
      expect(rows[0]?.local).toBe("10:00");

      const events = await tx
        .select({ payload: outbox.payload })
        .from(outbox)
        .where(eq(outbox.topic, "occupancy.entry_recorded.v1"));
      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({
        tenantId: env.f.tenantA,
        locationId: env.f.location01,
        day: DAY,
        entryId: r.value.entryId,
        chairId: chair(1),
      });
    });
  });

  it("[F0-010/AC1] upsert tej samej godziny aktualizuje wpis; commandId jest idempotentny", async () => {
    const first = base();
    const a = await db.withActor(env.reception, (tx) => recordOccupancy(tx, env.reception, first));
    const again = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, first),
    );
    expect(a.ok && again.ok && a.value.entryId === again.value.entryId).toBe(true);

    const b = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ category: "Z+", amountGrosze: 100n })),
    );
    expect(b.ok && b.value.created).toBe(false);
    if (a.ok && b.ok) expect(b.value.entryId).toBe(a.value.entryId);

    const list = await db.withActor(env.reception, (tx) =>
      listOccupancy(tx, env.reception, {
        locationId: env.f.location01,
        from: DAY,
        to: DAY,
      }),
    );
    expect(list.ok && list.value).toHaveLength(1);
    if (list.ok)
      expect(list.value[0]).toMatchObject({ category: "Z+", amountGrosze: 100n, hour: 10 });
  });

  it("[F0-010/AC1] recordOccupancyRange zapisuje wiele godzin, a błąd cofa całość", async () => {
    const ok = await db.withActor(env.reception, (tx) =>
      recordOccupancyRange(tx, env.reception, {
        ...base(),
        hour: undefined,
        fromHour: 9,
        toHour: 12,
        amountGrosze: null,
      }),
    );
    expect(ok.ok && ok.value.entryIds).toHaveLength(3);

    // 19–21 → godzina 20 poza otwarciem → cała seria odrzucona (19 nie zostaje)
    const bad = await db.withActor(env.reception, (tx) =>
      recordOccupancyRange(tx, env.reception, {
        ...base({ chairId: chair(2) }),
        hour: undefined,
        fromHour: 19,
        toHour: 21,
      }),
    );
    expect(bad.ok).toBe(false);
    const list = await db.withActor(env.reception, (tx) =>
      listOccupancy(tx, env.reception, {
        locationId: env.f.location01,
        from: DAY,
        to: DAY,
        chairId: chair(2),
      }),
    );
    expect(list.ok && list.value).toHaveLength(0);
  });

  it("[F0-010/AC3] 20:00–21:00: recepcja odrzucona, kierownik z powodem zapisuje; powód w audycie", async () => {
    const denied = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ hour: 20 })),
    );
    expect(denied.ok).toBe(false);

    const noReason = await db.withActor(env.manager, (tx) =>
      recordOccupancy(tx, env.manager, base({ hour: 20 })),
    );
    expect(noReason.ok).toBe(false);

    const ok = await db.withActor(env.manager, (tx) =>
      recordOccupancy(tx, env.manager, base({ hour: 20, overrideReason: "pilny zabieg" })),
    );
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    await db.withActor(env.manager, async (tx) => {
      const rows = await tx
        .select({ reason: chairOccupancy.overrideReason })
        .from(chairOccupancy)
        .where(eq(chairOccupancy.id, ok.value.entryId));
      expect(rows[0]?.reason).toBe("pilny zabieg");
    });
    const auditor: Actor = { ...env.manager, permissions: ["audit.read"] };
    await db.withActor(auditor, async (tx) => {
      const audit = await tx
        .select({ after: auditEvents.after })
        .from(auditEvents)
        .where(eq(auditEvents.rowId, ok.value.entryId));
      expect(JSON.stringify(audit)).toContain("pilny zabieg");
    });
  });

  it("[F0-010/AC5] zamknięty dzień: recepcja odrzucona, kierownik edytuje; podsumowanie i zdarzenie", async () => {
    await db.withActor(env.reception, async (tx) => {
      for (const [i, hour] of [
        [0, 9],
        [0, 10],
        [1, 11],
      ] as const) {
        const r = await recordOccupancy(tx, env.reception, base({ chairId: chair(i), hour }));
        expect(r.ok).toBe(true);
      }
    });

    const closed = await db.withActor(env.reception, (tx) =>
      closeDay(tx, env.reception, { commandId: newId(), locationId: env.f.location01, day: DAY }),
    );
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.value.summary.hours).toBe(3);
      expect(closed.value.summary.amount_grosze).toBe(135000);
      expect(closed.value.summary.chairs_without_entries).toEqual([chair(2)]);
    }

    const twice = await db.withActor(env.reception, (tx) =>
      closeDay(tx, env.reception, { commandId: newId(), locationId: env.f.location01, day: DAY }),
    );
    expect(twice.ok).toBe(false);

    const rejected = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ chairId: chair(2), hour: 12 })),
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toMatchObject({ type: "forbidden" });

    const byManager = await db.withActor(env.manager, (tx) =>
      recordOccupancy(tx, env.manager, base({ chairId: chair(2), hour: 12 })),
    );
    expect(byManager.ok).toBe(true);

    const noReopenRight = await db.withActor(env.reception, (tx) =>
      reopenDay(tx, env.reception, {
        commandId: newId(),
        locationId: env.f.location01,
        day: DAY,
        reason: "korekta",
      }),
    );
    expect(noReopenRight.ok).toBe(false);

    const reopened = await db.withActor(env.manager, (tx) =>
      reopenDay(tx, env.manager, {
        commandId: newId(),
        locationId: env.f.location01,
        day: DAY,
        reason: "korekta",
      }),
    );
    expect(reopened.ok).toBe(true);
    const afterReopen = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ chairId: chair(2), hour: 13 })),
    );
    expect(afterReopen.ok).toBe(true);

    await db.withActor(env.reception, async (tx) => {
      const topics = await tx.select({ topic: outbox.topic }).from(outbox);
      const names = topics.map((t) => t.topic);
      expect(names).toContain("occupancy.day_closed.v1");
      expect(names).toContain("occupancy.day_reopened.v1");
    });
  });

  it("[F0-010/AC6] unieważnienie wymaga powodu; wiersz zostaje; siatka go nie pokazuje; godzinę można wpisać ponownie", async () => {
    const r = await db.withActor(env.reception, (tx) => recordOccupancy(tx, env.reception, base()));
    if (!r.ok) throw new Error("record");

    const noReason = await db.withActor(env.reception, (tx) =>
      voidOccupancy(tx, env.reception, {
        commandId: newId(),
        entryId: r.value.entryId,
        reason: " ",
      }),
    );
    expect(noReason.ok).toBe(false);

    const voided = await db.withActor(env.reception, (tx) =>
      voidOccupancy(tx, env.reception, {
        commandId: newId(),
        entryId: r.value.entryId,
        reason: "pomyłka fotela",
      }),
    );
    expect(voided.ok).toBe(true);

    await db.withActor(env.reception, async (tx) => {
      const rows = await tx
        .select({ at: chairOccupancy.voidedAt, reason: chairOccupancy.voidReason })
        .from(chairOccupancy)
        .where(eq(chairOccupancy.id, r.value.entryId));
      expect(rows[0]?.at).not.toBeNull();
      expect(rows[0]?.reason).toBe("pomyłka fotela");

      const ev = await tx
        .select({ payload: outbox.payload })
        .from(outbox)
        .where(eq(outbox.topic, "occupancy.entry_voided.v1"));
      expect(ev[0]?.payload).toMatchObject({ entryId: r.value.entryId, chairId: chair(1) });

      const active = await tx
        .select({ id: chairOccupancy.id })
        .from(chairOccupancy)
        .where(and(eq(chairOccupancy.id, r.value.entryId), isNull(chairOccupancy.voidedAt)));
      expect(active).toHaveLength(0);
    });

    const grid = await db.withActor(env.reception, (tx) =>
      getDayGrid(tx, env.reception, { locationIds: [env.f.location01], day: DAY }),
    );
    expect(grid.ok && grid.value.locations[0]?.chairs.flatMap((c) => c.entries)).toHaveLength(0);

    const again = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ category: "Z1" })),
    );
    expect(again.ok && again.value.created).toBe(true);
  });

  it("[F0-010/AC8] blokada fotela 12:00–14:00 odrzuca wpis o 13:00; zakończona blokada przestaje blokować", async () => {
    const block = await db.withActor(env.reception, (tx) =>
      createTimeBlock(tx, env.reception, {
        commandId: newId(),
        locationId: env.f.location01,
        chairId: chair(2),
        day: DAY,
        startHour: 12,
        endHour: 14,
        kind: "serwis",
      }),
    );
    expect(block.ok).toBe(true);
    if (!block.ok) return;

    const blocked = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ chairId: chair(2), hour: 13 })),
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatchObject({ details: { code: "chair_blocked" } });

    const outside = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ chairId: chair(2), hour: 14 })),
    );
    expect(outside.ok).toBe(true);

    const grid = await db.withActor(env.reception, (tx) =>
      getDayGrid(tx, env.reception, { locationIds: [env.f.location01], day: DAY }),
    );
    const c3 = grid.ok ? grid.value.locations[0]?.chairs.find((c) => c.chairId === chair(2)) : null;
    expect(c3?.blocks).toMatchObject([{ startHour: 12, endHour: 14, kind: "serwis" }]);

    const ended = await db.withActor(env.reception, (tx) =>
      endTimeBlock(tx, env.reception, { commandId: newId(), blockId: block.value.id }),
    );
    expect(ended.ok).toBe(true);
    const free = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ chairId: chair(2), hour: 13 })),
    );
    expect(free.ok).toBe(true);
  });

  it("[F0-010/AC7] notatka z numerem telefonu odrzucona; zwykła przechodzi", async () => {
    const bad = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ note: "pacjent Kowalski 600123456" })),
    );
    expect(bad.ok).toBe(false);
    const good = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ note: "wymiana żarówki w lampie" })),
    );
    expect(good.ok).toBe(true);
  });

  it("[F0-010/AC10] getDayGrid zwraca fotele, godziny otwarcia, wpisy, blokady i status zamknięcia", async () => {
    await db.withActor(env.reception, async (tx) => {
      await recordOccupancy(tx, env.reception, base({ chairId: chair(0), hour: 9 }));
      await recordOccupancy(
        tx,
        env.reception,
        base({ chairId: chair(1), hour: 15, amountGrosze: null }),
      );
      await createTimeBlock(tx, env.reception, {
        commandId: newId(),
        locationId: env.f.location01,
        chairId: chair(2),
        day: DAY,
        startHour: 8,
        endHour: 10,
        kind: "serwis",
      });
    });
    const grid = await db.withActor(env.reception, (tx) =>
      getDayGrid(tx, env.reception, { locationIds: [env.f.location01], day: DAY }),
    );
    expect(grid.ok).toBe(true);
    if (!grid.ok) return;
    const loc = grid.value.locations[0];
    expect(loc).toMatchObject({ closedAllDay: false, dayClosed: false });
    expect(loc?.opens?.startsWith("08:00")).toBe(true);
    expect(loc?.closes?.startsWith("20:00")).toBe(true);
    expect(loc?.chairs.map((c) => c.name)).toEqual(["Fotel 1", "Fotel 2", "Fotel 3"]);
    expect(loc?.chairs[0]?.entries[0]).toMatchObject({
      hour: 9,
      category: "Z3",
      amountGrosze: 45000n,
    });
    expect(loc?.chairs[1]?.entries[0]).toMatchObject({ hour: 15, amountGrosze: null });
    expect(loc?.chairs[2]?.blocks).toHaveLength(1);

    await db.withActor(env.reception, (tx) =>
      closeDay(tx, env.reception, { commandId: newId(), locationId: env.f.location01, day: DAY }),
    );
    const closedGrid = await db.withActor(env.reception, (tx) =>
      getDayGrid(tx, env.reception, { locationIds: [env.f.location01], day: DAY }),
    );
    expect(closedGrid.ok && closedGrid.value.locations[0]?.dayClosed).toBe(true);
  });

  it("[F0-010/AC11] tryb appointments odrzuca ręczne wpisy z czytelnym kodem", async () => {
    const set = await db.withActor(env.admin, (tx) =>
      setSetting(tx, env.admin, "scheduling.occupancy_mode", "appointments", env.f.location01),
    );
    expect(set.ok).toBe(true);
    const r = await db.withActor(env.reception, (tx) => recordOccupancy(tx, env.reception, base()));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatchObject({ details: { code: "occupancy_mode_appointments" } });
    }
  });

  it("[F0-010/AC4] brak uprawnień lub gabinetu: odmowa; write_own tylko dla siebie", async () => {
    const otherLoc = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ locationId: env.f.location02 })),
    );
    expect(otherLoc.ok).toBe(false);

    const own = await db.withActor(env.provider, (tx) =>
      recordOccupancy(tx, env.provider, base({ providerId: env.provider.staffId })),
    );
    expect(own.ok).toBe(true);
    const foreign = await db.withActor(env.provider, (tx) =>
      recordOccupancy(tx, env.provider, base({ hour: 11, providerId: env.f.staff.assistant })),
    );
    expect(foreign.ok).toBe(false);
  });

  it("[F0-010/AC4] wykonawca z uprawnieniami z seedu (write_own + void) zmienia i anuluje tylko własne wpisy", async () => {
    // Uprawnienia jak w migracji 0007 dla dentist/hygienist (audyt 1.0).
    const dentist: Actor = {
      ...env.provider,
      permissions: ["occupancy.read", "occupancy.write_own", "occupancy.void", "analytics.view_self"],
    };
    const colleague = await db.withActor(env.reception, (tx) =>
      recordOccupancy(tx, env.reception, base({ providerId: env.f.staff.assistant, amountGrosze: 45000n })),
    );
    if (!colleague.ok) throw new Error("record colleague");

    const overwrite = await db.withActor(dentist, (tx) =>
      recordOccupancy(tx, dentist, base({ providerId: dentist.staffId, amountGrosze: 1n })),
    );
    expect(overwrite.ok).toBe(false);
    if (!overwrite.ok) expect(overwrite.error).toMatchObject({ details: { code: "chair_occupied" } });

    const voidForeign = await db.withActor(dentist, (tx) =>
      voidOccupancy(tx, dentist, { commandId: newId(), entryId: colleague.value.entryId, reason: "nie moje" }),
    );
    expect(voidForeign.ok).toBe(false);
    if (!voidForeign.ok) expect(voidForeign.error).toMatchObject({ type: "forbidden" });

    await db.withActor(env.reception, async (tx) => {
      const rows = await tx
        .select({ amount: chairOccupancy.amountGrosze, provider: chairOccupancy.providerId, voided: chairOccupancy.voidedAt })
        .from(chairOccupancy)
        .where(eq(chairOccupancy.id, colleague.value.entryId));
      expect(rows[0]).toMatchObject({ amount: 45000n, provider: env.f.staff.assistant, voided: null });
    });

    const own = await db.withActor(dentist, (tx) =>
      recordOccupancy(tx, dentist, base({ hour: 11, providerId: dentist.staffId })),
    );
    if (!own.ok) throw new Error("record own");
    const ownUpdate = await db.withActor(dentist, (tx) =>
      recordOccupancy(tx, dentist, base({ hour: 11, providerId: dentist.staffId, amountGrosze: 50000n })),
    );
    expect(ownUpdate.ok && ownUpdate.value.created).toBe(false);
    const voidOwn = await db.withActor(dentist, (tx) =>
      voidOccupancy(tx, dentist, { commandId: newId(), entryId: own.value.entryId, reason: "pomyłka" }),
    );
    expect(voidOwn.ok).toBe(true);
  });

  it("[F0-010/AC5] zamknięty dzień blokuje baza także z pominięciem przypadku użycia", async () => {
    const entry = await db.withActor(env.reception, (tx) => recordOccupancy(tx, env.reception, base()));
    if (!entry.ok) throw new Error("record");
    const closed = await db.withActor(env.reception, (tx) =>
      closeDay(tx, env.reception, { commandId: newId(), locationId: env.f.location01, day: DAY }),
    );
    expect(closed.ok).toBe(true);

    await expect(
      db.withActor(env.reception, (tx) =>
        tx.update(chairOccupancy).set({ amountGrosze: 1n }).where(eq(chairOccupancy.id, entry.value.entryId)),
      ),
    ).rejects.toMatchObject({ mapped: { type: "forbidden" } });

    await db.withActor(env.manager, (tx) =>
      tx.update(chairOccupancy).set({ amountGrosze: 46000n }).where(eq(chairOccupancy.id, entry.value.entryId)),
    );
  });

  it("copyDayFrom kopiuje wykonawców i kategorie bez kwot i notatek", async () => {
    await db.withActor(env.reception, async (tx) => {
      await recordOccupancy(tx, env.reception, base({ hour: 9, note: "x" }));
      await recordOccupancy(tx, env.reception, base({ hour: 10, category: "Z5" }));
    });
    const r = await db.withActor(env.reception, (tx) =>
      copyDayFrom(tx, env.reception, {
        commandId: newId(),
        locationId: env.f.location01,
        fromDay: DAY,
        toDay: NEXT_DAY,
      }),
    );
    expect(r.ok && r.value).toEqual({ copied: 2, skipped: 0 });

    const list = await db.withActor(env.reception, (tx) =>
      listOccupancy(tx, env.reception, {
        locationId: env.f.location01,
        from: NEXT_DAY,
        to: NEXT_DAY,
      }),
    );
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value.map((e) => [e.hour, e.category, e.amountGrosze, e.note])).toEqual([
        [9, "Z3", null, null],
        [10, "Z5", null, null],
      ]);
      expect(list.value[0]?.providerId).toBe(env.f.staff.dentist);
    }

    const second = await db.withActor(env.reception, (tx) =>
      copyDayFrom(tx, env.reception, {
        commandId: newId(),
        locationId: env.f.location01,
        fromDay: DAY,
        toDay: NEXT_DAY,
      }),
    );
    expect(second.ok && second.value).toEqual({ copied: 0, skipped: 2 });
  });

  it("getWeekSummary sumuje godziny i kwoty po dniach", async () => {
    await db.withActor(env.reception, async (tx) => {
      await recordOccupancy(tx, env.reception, base({ hour: 9 }));
      await recordOccupancy(tx, env.reception, base({ hour: 10, amountGrosze: 5000n }));
      await recordOccupancy(tx, env.reception, base({ day: NEXT_DAY, hour: 9 }));
    });
    const w = await db.withActor(env.reception, (tx) =>
      getWeekSummary(tx, env.reception, { locationId: env.f.location01, weekStart: "2027-03-08" }),
    );
    expect(w.ok).toBe(true);
    if (!w.ok) return;
    expect(w.value.days).toHaveLength(7);
    expect(w.value.days[2]).toMatchObject({ day: DAY, hours: 2, amountGrosze: 50000n });
    expect(w.value.days[3]).toMatchObject({ day: NEXT_DAY, hours: 1, amountGrosze: 45000n });
    expect(w.value.days[0]).toMatchObject({ hours: 0, amountGrosze: 0n, closed: false });
  });
});
