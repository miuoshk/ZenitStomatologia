import type { SVGProps } from "react";
import geometry from "./arch-geometry.json";
import { formatNumber } from "../lib/format";
import { TableView } from "../components/data";

export interface ArchGaugeProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** Obłożenie 0..1. */
  value: number;
  label?: string;
  width?: number;
  /** Zamiast wykresu pokaż odpowiednik tabelaryczny. */
  asTable?: boolean;
}

const TEETH = geometry.zeby.length; // 16

export function ArchGauge({ value, label, width = 320, asTable = false, ...rest }: ArchGaugeProps) {
  const v = Math.max(0, Math.min(1, value));
  const filled = Math.round(v * TEETH);
  const pct = formatNumber(v, "pct");
  const desc = `Łuk obłożenia ${pct}${label ? `, ${label}` : ""}: ${filled} z ${TEETH} zębów`;
  if (asTable) {
    return <TableView caption={desc} columns={["Wskaźnik", "Wartość"]} rows={[[label ?? "Obłożenie", pct]]} />;
  }
  const s = width;
  const h = geometry.wysokosc * s;
  const extra = label ? 32 : 0;
  return (
    <svg role="img" aria-label={desc} viewBox={`0 0 ${s} ${h + extra}`} width={s} height={h + extra} {...rest}>
      <title>{desc}</title>
      {geometry.zeby.map((t, i) => (
        <circle
          key={t.i}
          cx={t.cx * s}
          cy={t.cy * s}
          r={t.r * s}
          fill={i < filled ? "var(--zenit-zielen)" : "var(--dane-kulka-pusta)"}
        />
      ))}
      <text
        x={s / 2}
        y={h * 0.62}
        textAnchor="middle"
        fontSize={s * 0.22}
        fontWeight={800}
        fill="var(--text-primary)"
        style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
      >
        {pct}
      </text>
      {label ? (
        <text
          x={s / 2}
          y={h + 22}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          letterSpacing={1.2}
          fill="var(--text-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
