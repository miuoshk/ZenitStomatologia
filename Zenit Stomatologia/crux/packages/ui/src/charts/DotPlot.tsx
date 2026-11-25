import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

export interface DotPlotSeries {
  /** Zmienna CSS koloru, np. "var(--dane-gabinet-01)". */
  color: string;
  name: string;
  value: number;
}

export interface DotPlotRow {
  label: string;
  series: DotPlotSeries[];
}

export interface DotPlotProps {
  rows: DotPlotRow[];
  min?: number;
  max?: number;
  /** Format osi: wartości 0..100 jako %. */
  unit?: string;
  label: string;
  width?: number;
  asTable?: boolean;
}

const mono = { fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" } as const;

export function DotPlot({ rows, min = 0, max = 100, unit = "%", label, width = 620, asTable = false }: DotPlotProps) {
  const names = rows[0]?.series.map((s) => s.name) ?? [];
  const desc = `${label}: ${rows.map((r) => `${r.label} ${r.series.map((s) => `${s.name} ${formatNumber(s.value)}${unit}`).join(", ")}`).join("; ")}`;
  if (asTable) {
    return (
      <TableView
        caption={desc}
        columns={["", ...names]}
        rows={rows.map((r) => [r.label, ...r.series.map((s) => `${formatNumber(s.value)}${unit}`)])}
      />
    );
  }
  const x0 = 180;
  const x1 = width - 30;
  const rowH = 46;
  const h = rows.length * rowH + 28;
  const sx = (v: number) => x0 + ((v - min) / (max - min || 1)) * (x1 - x0);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${width} ${h}`} width={width} height={h}>
      <title>{desc}</title>
      {rows.map((r, i) => {
        const y = 23 + i * rowH;
        const vals = r.series.map((s) => s.value);
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        return (
          <g key={r.label}>
            <text x={0} y={y + 4} fontSize={13} fontWeight={600} fill="var(--text-primary)" style={mono}>
              {r.label}
            </text>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke="var(--grid)" />
            <line x1={sx(lo)} y1={y} x2={sx(hi)} y2={y} stroke="var(--zenit-porost)" strokeWidth={3} strokeLinecap="round" />
            {r.series.map((s) => (
              <g key={s.name}>
                <circle cx={sx(s.value)} cy={y} r={8} fill="var(--surface-card)" />
                <circle cx={sx(s.value)} cy={y} r={6} fill={s.color} />
              </g>
            ))}
          </g>
        );
      })}
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={h - 6} textAnchor="middle" fontSize={11} fontWeight={500} fill="var(--text-muted)" style={mono}>
          {formatNumber(t)}
          {unit}
        </text>
      ))}
    </svg>
  );
}
