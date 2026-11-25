"use client";
import { createElement, type ComponentType } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ReferenceLine as RechartsReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TableView } from "../components/data";
import { formatNumber } from "../lib/format";

/** Recharts 3 + React 19 typy JSX bywają niespójne. */
const ReferenceLine = RechartsReferenceLine as unknown as ComponentType<Record<string, unknown>>;

export interface LineSeries {
  key: string;
  name: string;
  /** Zmienna CSS koloru. */
  color: string;
}

export interface LineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: LineSeries[];
  label: string;
  height?: number;
  target?: number;
  asTable?: boolean;
}

const tick = { fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-sans)" } as const;

export function LineChart({ data, xKey, series, label, height = 320, target, asTable = false }: LineChartProps) {
  const desc = `${label}: ${series.map((s) => s.name).join(", ")}; ${data.length} punktów`;
  if (asTable) {
    return (
      <TableView
        caption={desc}
        columns={["", ...series.map((s) => s.name)]}
        rows={data.map((d) => [String(d[xKey] ?? ""), ...series.map((s) => (typeof d[s.key] === "number" ? formatNumber(d[s.key] as number) : "\u2014"))])}
      />
    );
  }
  return (
    <div role="img" aria-label={desc} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} width={44} />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? formatNumber(v) : String(v))}
            contentStyle={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-input)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          />
          {target !== undefined
            ? createElement(ReferenceLine, {
                y: target,
                stroke: "var(--text-muted)",
                strokeDasharray: "3 3",
                label: {
                  value: "cel",
                  fill: "var(--text-muted)",
                  fontSize: 11,
                  position: "insideTopLeft",
                },
              })
            : null}
          {series.map((s) => (
            <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: s.color, stroke: "var(--surface-card)", strokeWidth: 2 }} isAnimationActive={false} />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
