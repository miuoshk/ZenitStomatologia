export interface SparklineProps {
  values: number[];
  label: string;
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ values, label, width = 96, height = 40, color = "var(--zenit-zielen)" }: SparklineProps) {
  const desc = `${label}: od ${values[0] ?? 0} do ${values[values.length - 1] ?? 0}`;
  const pad = 4;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const sx = (i: number) => pad + (values.length < 2 ? 0 : (i / (values.length - 1)) * (width - pad * 2));
  const sy = (v: number) => height - pad - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (height - pad * 2);
  const pts = values.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none">
      <title>{desc}</title>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {values.length > 0 ? <circle cx={sx(last)} cy={sy(values[last] ?? 0)} r={3} fill={color} /> : null}
    </svg>
  );
}
