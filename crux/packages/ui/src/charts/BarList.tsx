import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

export interface BarListItem {
  label: string;
  value: number;
  /** Zmienna CSS koloru znacznika (np. var(--kolornik-z3)). */
  swatch?: string;
}

export interface BarListProps {
  items: BarListItem[];
  label: string;
  /** funnel: słupki względem pierwszego elementu, ze współczynnikiem przejścia. */
  variant?: "list" | "funnel";
  width?: number;
  asTable?: boolean;
}

export function BarList({ items, label, variant = "list", width = 560, asTable = false }: BarListProps) {
  const desc = `${label}: ${items.map((i) => `${i.label} ${formatNumber(i.value)}`).join(", ")}`;
  if (asTable) {
    return <TableView caption={desc} columns={["Pozycja", "Wartość"]} rows={items.map((i) => [i.label, formatNumber(i.value)])} />;
  }
  const base = variant === "funnel" ? (items[0]?.value ?? 1) : Math.max(...items.map((i) => i.value), 1);
  const rowH = 36;
  const labelW = 200;
  const barMax = width - labelW - 80;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${width} ${items.length * rowH}`} width={width} height={items.length * rowH}>
      <title>{desc}</title>
      {items.map((it, i) => {
        const y = i * rowH;
        const w = Math.max(4, (it.value / (base || 1)) * barMax);
        const prev = items[i - 1];
        const conv = variant === "funnel" && prev && prev.value > 0 ? ` (${formatNumber(it.value / prev.value, "pct")})` : "";
        return (
          <g key={it.label}>
            {it.swatch ? <rect x={0} y={y + 4} width={14} height={14} rx={4} fill={it.swatch} stroke="var(--grid)" /> : null}
            <text x={it.swatch ? 22 : 0} y={y + 16} fontSize={13} fontWeight={500} fill="var(--text-primary)" style={{ fontFamily: "var(--font-sans)" }}>
              {it.label}
            </text>
            <rect x={labelW} y={y + 2} width={w} height={20} rx={4} fill="var(--zenit-las)" />
            <text
              x={labelW + w + 8}
              y={y + 16}
              fontSize={13}
              fontWeight={700}
              fill="var(--text-primary)"
              style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
            >
              {formatNumber(it.value)}
              {conv}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
