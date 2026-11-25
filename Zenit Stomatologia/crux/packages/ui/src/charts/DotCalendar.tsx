import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

export interface DotCalendarDay {
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Wartość 0..1 (intensywność). */
  value: number;
}

export interface DotCalendarProps {
  days: DotCalendarDay[];
  label: string;
  asTable?: boolean;
}

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const SCALE = [
  "var(--dane-skala-1)",
  "var(--dane-skala-2)",
  "var(--dane-skala-3)",
  "var(--dane-skala-4)",
  "var(--dane-skala-5)",
  "var(--dane-skala-6)",
  "var(--dane-skala-7)",
];

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

/** Kalendarz kropkowy: tygodnie w kolumnach, dni tygodnia w wierszach. */
export function DotCalendar({ days, label, asTable = false }: DotCalendarProps) {
  const desc = `${label}: ${days.length} dni`;
  if (asTable) {
    return (
      <TableView
        caption={desc}
        columns={["Data", "Wartość"]}
        rows={days.map((d) => [d.date, formatNumber(d.value, "pct")])}
      />
    );
  }
  const step = 22;
  const first = days[0] ? weekday(days[0].date) : 0;
  const cols = Math.ceil((days.length + first) / 7);
  const left = 26;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${left + cols * step} ${7 * step}`} width={left + cols * step} height={7 * step}>
      <title>{desc}</title>
      {WEEKDAYS.map((w, i) => (
        <text key={w} x={0} y={i * step + 15} fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>
          {w}
        </text>
      ))}
      {days.map((d, i) => {
        const idx = i + first;
        const level = Math.min(SCALE.length - 1, Math.max(0, Math.round(d.value * (SCALE.length - 1))));
        return (
          <circle
            key={d.date}
            cx={left + Math.floor(idx / 7) * step + step / 2}
            cy={(idx % 7) * step + step / 2}
            r={8}
            fill={SCALE[level] ?? "var(--dane-kulka-pusta)"}
          >
            <title>{`${d.date}: ${formatNumber(d.value, "pct")}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
