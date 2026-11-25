import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

export interface PartsBarPart {
  label: string;
  value: number;
  /** Zmienna CSS koloru wypełnienia. */
  color: string;
  /** Kolor tekstu na segmencie (domyślnie jasny). */
  textColor?: string;
}

export interface PartsBarProps {
  parts: PartsBarPart[];
  label: string;
  width?: number;
  asTable?: boolean;
}

export function PartsBar({ parts, label, width = 560, asTable = false }: PartsBarProps) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const desc = `${label}: ${parts.map((p) => `${p.label} ${formatNumber(p.value / total, "pct")}`).join(", ")}`;
  if (asTable) {
    return <TableView caption={desc} columns={["Część", "Udział"]} rows={parts.map((p) => [p.label, formatNumber(p.value / total, "pct")])} />;
  }
  const gap = 2;
  const usable = width - gap * (parts.length - 1);
  let x = 0;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${width} 28`} width={width} height={28}>
      <title>{desc}</title>
      {parts.map((p) => {
        const w = (p.value / total) * usable;
        const cx = x;
        x += w + gap;
        return (
          <g key={p.label}>
            <rect x={cx} y={0} width={w} height={28} rx={4} fill={p.color}>
              <title>{`${p.label}: ${formatNumber(p.value / total, "pct")}`}</title>
            </rect>
            {w > 40 ? (
              <text
                x={cx + 8}
                y={18.5}
                fontSize={12}
                fontWeight={700}
                fill={p.textColor ?? "var(--zenit-kosc)"}
                style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
              >
                {formatNumber(p.value / total, "pct")}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
