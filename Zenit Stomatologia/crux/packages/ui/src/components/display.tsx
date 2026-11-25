"use client";
import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { formatDateTimePl, formatNumber } from "../lib/format";
import { Num, type NumProps } from "./Num";
import { SegmentedControl } from "./controls";

const pill = cva("inline-flex items-center gap-1.5 rounded-[var(--radius-pelne)] px-3 py-1 text-xs font-bold", {
  variants: {
    status: {
      dobrze: "bg-[var(--status-dobrze-tlo)] text-[var(--status-dobrze)]",
      uwaga: "bg-[var(--status-uwaga-tlo)] text-[var(--status-uwaga)]",
      powazne: "bg-[var(--status-powazne-tlo)] text-[var(--status-powazne)]",
      krytyczne: "bg-[var(--status-krytyczne-tlo)] text-[var(--status-krytyczne)]",
    },
  },
  defaultVariants: { status: "dobrze" },
});

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pill> {}

export function StatusPill({ status, className, children, ...rest }: StatusPillProps) {
  return (
    <span className={cn(pill({ status }), className)} {...rest}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export interface DeltaBadgeProps {
  /** Zmiana względna (0,05 = +5%) lub bezwzględna przy unit. */
  value: number;
  /** true gdy wzrost jest korzystny (domyślnie). */
  higherIsBetter?: boolean;
  unit?: string;
  className?: string;
}

export function DeltaBadge({ value, higherIsBetter = true, unit, className }: DeltaBadgeProps) {
  const flat = value === 0;
  const good = higherIsBetter ? value > 0 : value < 0;
  const arrow = flat ? "\u2192" : value > 0 ? "\u2191" : "\u2193";
  const text = unit
    ? `${value > 0 ? "+" : ""}${formatNumber(value, "dec1")}\u00A0${unit}`
    : `${value > 0 ? "+" : ""}${formatNumber(value * 100, "dec1")}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pelne)] px-2 py-0.5 text-xs font-bold tabular-nums",
        flat
          ? "bg-[var(--surface-sunken)] text-[var(--text-muted)]"
          : good
            ? "bg-[var(--status-dobrze-tlo)] text-[var(--status-dobrze)]"
            : "bg-[var(--status-krytyczne-tlo)] text-[var(--status-krytyczne)]",
        className,
      )}
      aria-label={`${good ? "poprawa" : flat ? "bez zmian" : "pogorszenie"}: ${text}`}
    >
      <span aria-hidden>{arrow}</span>
      {text}
    </span>
  );
}

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-karta)] border border-[var(--border)] bg-[var(--surface-card)] p-6 text-[var(--text-primary)]",
        className,
      )}
      {...rest}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, hint, actions, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold leading-tight">{title}</h3>
        {hint ? <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export interface KpiTileProps extends Pick<NumProps, "format" | "unit"> {
  label: string;
  value: number | null;
  delta?: number;
  deltaHigherIsBetter?: boolean;
  status?: "dobrze" | "uwaga" | "powazne" | "krytyczne";
  statusLabel?: string;
  /** Slot na Sparkline. */
  spark?: ReactNode;
  className?: string;
}

export function KpiTile({ label, value, format, unit, delta, deltaHigherIsBetter, status, statusLabel, spark, className }: KpiTileProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
        {status ? <StatusPill status={status}>{statusLabel ?? status}</StatusPill> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <Num
          value={value}
          {...(format ? { format } : {})}
          {...(unit ? { unit } : {})}
          className="text-4xl font-extrabold leading-none tracking-tight"
        />
        {spark ? <div className="h-10 w-24 shrink-0">{spark}</div> : null}
      </div>
      {delta !== undefined ? (
        <DeltaBadge value={delta} {...(deltaHigherIsBetter !== undefined ? { higherIsBetter: deltaHigherIsBetter } : {})} />
      ) : null}
    </Card>
  );
}

export interface ChartCardProps {
  title: string;
  hint?: string;
  legend?: ReactNode;
  /** Widok wykresu. */
  chart: ReactNode;
  /** Widok tabeli (alternatywa dostępna). Włącza przełącznik. */
  table?: ReactNode;
  refreshedAt?: Date;
  loading?: boolean;
  className?: string;
}

export function ChartCard({ title, hint, legend, chart, table, refreshedAt, loading = false, className }: ChartCardProps) {
  const [view, setView] = useState<"wykres" | "tabela">("wykres");
  return (
    <Card className={className} aria-busy={loading}>
      <CardHeader
        title={title}
        {...(hint ? { hint } : {})}
        actions={
          table ? (
            <SegmentedControl
              aria-label="Widok"
              value={view}
              onChange={setView}
              options={[
                { value: "wykres", label: "Wykres" },
                { value: "tabela", label: "Tabela" },
              ]}
            />
          ) : null
        }
      />
      {legend ? <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">{legend}</div> : null}
      <div className={cn("transition-opacity duration-200", loading && "opacity-50")}>
        {view === "tabela" && table ? table : chart}
      </div>
      {refreshedAt ? (
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Odświeżono: <span className="tabular-nums">{formatDateTimePl(refreshedAt)}</span>
        </p>
      ) : null}
    </Card>
  );
}
