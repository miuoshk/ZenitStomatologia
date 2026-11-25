"use client";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { focusRing } from "./Button";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className, ...rest }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn("inline-flex rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-1", className)}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.ariaLabel}
            tabIndex={on ? 0 : -1}
            onClick={() => { onChange(o.value); }}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const n = options[(i + d + options.length) % options.length];
              if (n) onChange(n.value);
            }}
            className={cn(
              "min-h-9 rounded-[var(--radius-pole)] px-4 text-sm font-semibold transition-colors",
              on
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              focusRing,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ChipToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function ChipToggle({ pressed, onPressedChange, children, className }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => { onPressedChange(!pressed); }}
      className={cn(
        "inline-flex min-h-9 items-center rounded-[var(--radius-pelne)] border px-3.5 text-sm font-semibold transition-colors",
        pressed
          ? "border-[var(--zenit-zielen)] bg-[var(--zenit-zielen)] text-[var(--zenit-kosc)]"
          : "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
        focusRing,
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface LocationChipProps {
  code: string;
  name: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Chip gabinetu. Bursztyn: kropka przy nazwie i cień aktywnego chipa. */
export function LocationChip({ code, name, active = false, onClick, className }: LocationChipProps) {
  const body = (
    <>
      <span aria-hidden className="size-2 rounded-full bg-[var(--zenit-bursztyn)]" />
      <span className="tabular-nums text-[var(--text-muted)]">{code}</span>
      <span>{name}</span>
    </>
  );
  const cls = cn(
    "inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-pelne)] border px-3.5 text-sm font-semibold",
    "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)]",
    active && "border-[var(--zenit-zielen)] shadow-[0_2px_10px_color-mix(in_srgb,var(--zenit-bursztyn)_45%,transparent)]",
    className,
  );
  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn(cls, focusRing)}>
      {body}
    </button>
  ) : (
    <span className={cls}>{body}</span>
  );
}

export interface LocationItem {
  id: string;
  code: string;
  name: string;
}

export interface LocationSwitcherProps {
  locations: LocationItem[];
  /** null = wszystkie gabinety (gdy `allLabel` podany). */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Brak / undefined = bez opcji „wszystkie”. */
  allLabel?: string | null;
  className?: string;
}

export function LocationSwitcher({
  locations,
  value,
  onChange,
  allLabel = "Wszystkie",
  className,
}: LocationSwitcherProps) {
  const gid = useId();
  return (
    <div role="group" aria-labelledby={gid} className={cn("flex flex-wrap gap-2", className)}>
      <span id={gid} className="sr-only">
        Gabinet
      </span>
      {allLabel ? (
        <ChipToggle pressed={value === null} onPressedChange={() => { onChange(null); }}>
          {allLabel}
        </ChipToggle>
      ) : null}
      {locations.map((l) => (
        <LocationChip
          key={l.id}
          code={l.code}
          name={l.name}
          active={value === l.id}
          onClick={() => { onChange(l.id); }}
        />
      ))}
    </div>
  );
}
