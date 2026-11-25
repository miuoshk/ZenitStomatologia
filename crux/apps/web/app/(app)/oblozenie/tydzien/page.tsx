import { OCCUPANCY_LABELS, formatGrosze } from "@crux/i18n";
import { getWeekSummary } from "@crux/scheduling";
import { PlainDateSchema, plusMs, startOfDayIn, systemClock, toLocalDay } from "@crux/shared/time";
import { DotCalendar } from "@crux/ui";
import Link from "next/link";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";

type Props = { searchParams: Promise<{ tydzien?: string | string[] }> };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** Pon=0 … Nd=6 (bez `new Date`, ADR-022). */
function weekday(iso: string): number {
  const [ys, ms, ds] = iso.split("-");
  let y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  const monthOffset = t[m - 1] ?? 0;
  const sun0 = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + monthOffset + d) % 7;
  return (sun0 + 6) % 7;
}

function mondayOf(day: string): string {
  const offset = weekday(day);
  const start = startOfDayIn("Europe/Warsaw", PlainDateSchema.parse(day));
  return toLocalDay(plusMs(start, -offset * 24 * 3_600_000));
}

function shiftDays(day: string, deltaDays: number): string {
  const start = startOfDayIn("Europe/Warsaw", PlainDateSchema.parse(day));
  return toLocalDay(plusMs(start, deltaDays * 24 * 3_600_000));
}

export default async function OblozenieTydzienPage({ searchParams }: Props) {
  const actor = await requireActor();
  const params = await searchParams;
  const raw = Array.isArray(params.tydzien) ? params.tydzien[0] : params.tydzien;
  const today = toLocalDay(systemClock.now());
  const anchor = raw && DAY_RE.test(raw) ? raw : today;
  const weekStart = mondayOf(anchor);
  const weekEnd = shiftDays(weekStart, 6);
  const prevWeek = shiftDays(weekStart, -7);
  const nextWeek = shiftDays(weekStart, 7);

  const result = await getDb().withActor(actor, (tx) =>
    getWeekSummary(tx, actor, { locationId: actor.activeLocationId, weekStart }),
  );

  if (!result.ok) {
    return (
      <div>
        <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">
          {OCCUPANCY_LABELS.weekTitle}
        </h1>
        <p role="alert" className="mt-4 text-[var(--text-secondary)]">
          {result.error.type === "forbidden"
            ? "Brak uprawnień do podglądu obłożenia."
            : OCCUPANCY_LABELS.error}
        </p>
      </div>
    );
  }

  const maxHours = Math.max(1, ...result.value.days.map((d) => d.hours));
  const dots = result.value.days.map((d) => ({
    date: d.day,
    value: d.hours / maxHours,
  }));
  const totalHours = result.value.days.reduce((s, d) => s + d.hours, 0);
  const totalAmount = result.value.days.reduce((s, d) => s + d.amountGrosze, 0n);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">
          {OCCUPANCY_LABELS.weekTitle}
        </h1>
        <nav aria-label={OCCUPANCY_LABELS.weekNav} className="flex items-center gap-2 text-sm">
          <Link
            href={`/oblozenie/tydzien?tydzien=${prevWeek}`}
            className="rounded-[var(--radius-pelne)] border border-[var(--zenit-mech)] px-3 py-1"
            aria-label={OCCUPANCY_LABELS.prevWeek}
          >
            ←
          </Link>
          <span className="tabular-nums text-[var(--text-primary)]">
            {weekStart} – {weekEnd}
          </span>
          <Link
            href={`/oblozenie/tydzien?tydzien=${nextWeek}`}
            className="rounded-[var(--radius-pelne)] border border-[var(--zenit-mech)] px-3 py-1"
            aria-label={OCCUPANCY_LABELS.nextWeek}
          >
            →
          </Link>
          <Link
            href={`/oblozenie?dzien=${today}`}
            className="rounded-[var(--radius-pelne)] px-2 py-1 hover:bg-white/10"
          >
            {OCCUPANCY_LABELS.dayView}
          </Link>
        </nav>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        {OCCUPANCY_LABELS.summary(totalHours, formatGrosze(totalAmount))}
      </p>

      <DotCalendar days={dots} label={OCCUPANCY_LABELS.weekCalendar} />

      <table className="w-full max-w-xl text-left text-sm">
        <caption className="sr-only">{OCCUPANCY_LABELS.weekTable}</caption>
        <thead>
          <tr className="border-b border-[var(--zenit-mech)] text-[var(--text-secondary)]">
            <th scope="col" className="py-2 pr-4 font-medium">
              {OCCUPANCY_LABELS.day}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium tabular-nums">
              {OCCUPANCY_LABELS.hoursCol}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium tabular-nums">
              {OCCUPANCY_LABELS.amountCol}
            </th>
            <th scope="col" className="py-2 font-medium">
              {OCCUPANCY_LABELS.statusCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {result.value.days.map((d, i) => (
            <tr key={d.day} className="border-b border-[var(--zenit-mech)]/40">
              <td className="py-2 pr-4">
                <Link
                  href={`/oblozenie?dzien=${d.day}`}
                  className="text-[var(--text-primary)] underline-offset-2 hover:underline"
                >
                  {WEEKDAYS[i] ?? ""} {d.day}
                </Link>
              </td>
              <td className="py-2 pr-4 tabular-nums">{d.hours}</td>
              <td className="py-2 pr-4 tabular-nums">{formatGrosze(d.amountGrosze)}</td>
              <td className="py-2 text-[var(--text-secondary)]">
                {d.closed ? OCCUPANCY_LABELS.dayClosed : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
