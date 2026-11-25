import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

export interface DotGridProps {
  /** Liczba wypełnionych kropek. */
  value: number;
  total?: number;
  columns?: number;
  label: string;
  dotRadius?: number;
  gap?: number;
  asTable?: boolean;
}

export function DotGrid({ value, total = 100, columns = 10, label, dotRadius = 9, gap = 7, asTable = false }: DotGridProps) {
  const desc = `${label}: ${formatNumber(value)} z ${formatNumber(total)}`;
  if (asTable) return <TableView caption={desc} columns={["Miara", "Wartość", "Razem"]} rows={[[label, formatNumber(value), formatNumber(total)]]} />;
  const step = dotRadius * 2 + gap;
  const rows = Math.ceil(total / columns);
  const w = columns * step - gap;
  const h = rows * step - gap;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <title>{desc}</title>
      {Array.from({ length: total }, (_, i) => (
        <circle
          key={i}
          cx={dotRadius + (i % columns) * step}
          cy={dotRadius + Math.floor(i / columns) * step}
          r={dotRadius}
          fill={i < value ? "var(--dane-akcent)" : "var(--dane-kulka-pusta)"}
        />
      ))}
    </svg>
  );
}
