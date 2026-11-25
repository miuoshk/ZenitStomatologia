"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";
import { focusRing } from "./Button";
import { CruxLogo } from "./CruxLogo";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface AppShellProps {
  nav: NavItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
  /** Nad nawigacją (przełącznik gabinetu). */
  sidebarTop?: ReactNode;
  /** Stopka paska (użytkownik, blokada). */
  sidebarBottom?: ReactNode;
  /** Zastępuje domyślny znak + „Crux”. */
  brand?: ReactNode;
  collapsed?: boolean;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  nav,
  activeId,
  onNavigate,
  sidebarTop,
  sidebarBottom,
  brand,
  collapsed = false,
  header,
  children,
  className,
}: AppShellProps) {
  const width = collapsed ? 64 : 232;
  return (
    <div className={cn("flex min-h-dvh bg-[var(--surface-app)] text-[var(--text-primary)]", className)}>
      <nav
        aria-label="Główna nawigacja"
        className="flex shrink-0 flex-col gap-1 bg-[var(--zenit-butelka)] p-3 text-[var(--zenit-krem)]"
        style={{ width }}
      >
        <div className="mb-4 flex items-center gap-2 px-1 text-[var(--zenit-krem)]">
          {brand ?? (
            <>
              <CruxLogo size={28} className="text-[var(--zenit-krem)]" />
              {!collapsed ? <span className="text-lg font-extrabold tracking-wide">Crux</span> : null}
            </>
          )}
        </div>
        {sidebarTop}
        <div className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const on = n.id === activeId;
            const cls = cn(
              "flex min-h-11 items-center gap-3 rounded-[var(--radius-input)] px-3 text-[15px] font-semibold",
              on ? "bg-[var(--zenit-zielen)] text-[var(--zenit-kosc)]" : "hover:bg-[var(--zenit-zielen)]/40",
              focusRing,
            );
            const label = collapsed ? n.label.slice(0, 1) : n.label;
            return n.href ? (
              <a
                key={n.id}
                href={n.href}
                aria-current={on ? "page" : undefined}
                aria-label={n.label}
                className={cls}
                onClick={() => onNavigate?.(n.id)}
              >
                {n.icon}
                {label}
              </a>
            ) : (
              <button
                key={n.id}
                type="button"
                aria-current={on ? "page" : undefined}
                aria-label={n.label}
                className={cn(cls, "text-left")}
                onClick={() => onNavigate?.(n.id)}
              >
                {n.icon}
                {label}
              </button>
            );
          })}
        </div>
        {sidebarBottom}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        {header ? (
          <header className="flex items-center gap-4 border-b border-[var(--border)] px-6 py-3">{header}</header>
        ) : null}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  placeholder?: string;
}

export function CommandPalette({ open, onOpenChange, commands, placeholder = "Szukaj polecenia" }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const id = useId();
  const shown = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("pl");
    return s ? commands.filter((c) => c.label.toLocaleLowerCase("pl").includes(s)) : commands;
  }, [commands, q]);

  const run = (c: Command) => {
    onOpenChange(false);
    setQ("");
    c.run();
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-[var(--zenit-butelka)]/50" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[20%] z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-karta)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xl"
        >
          <RadixDialog.Title className="sr-only">Paleta poleceń</RadixDialog.Title>
          <input
            role="combobox"
            aria-expanded
            aria-controls={`${id}-l`}
            aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
            autoFocus
            value={q}
            placeholder={placeholder}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, shown.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                const c = shown[active];
                if (c) run(c);
              }
            }}
            className="w-full border-b border-[var(--border)] bg-transparent px-5 py-4 text-base outline-none placeholder:text-[var(--text-muted)]"
          />
          <ul id={`${id}-l`} role="listbox" className="max-h-72 overflow-auto p-2">
            {shown.length === 0 ? <li className="px-3 py-3 text-sm text-[var(--text-muted)]">Brak wyników</li> : null}
            {shown.map((c, i) => (
              <li
                key={c.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => { setActive(i); }}
                onClick={() => { run(c); }}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-[var(--radius-pole)] px-3 py-2.5 text-[15px]",
                  i === active && "bg-[var(--surface-sunken)]",
                )}
              >
                <span>{c.label}</span>
                {c.hint ? <span className="text-xs text-[var(--text-muted)]">{c.hint}</span> : null}
              </li>
            ))}
          </ul>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface HourGridProps {
  /** Etykiety godzin (wiersze), np. "08:00". */
  hours: string[];
  /** Etykiety kolumn (np. fotele). */
  columns: string[];
  isSelected?: (hourIdx: number, colIdx: number) => boolean;
  isDisabled?: (hourIdx: number, colIdx: number) => boolean;
  renderCell?: (hourIdx: number, colIdx: number) => ReactNode;
  onSelect?: (hourIdx: number, colIdx: number) => void;
  "aria-label": string;
  className?: string;
}

/** Siatka godziny x kolumny; nawigacja strzałkami (roving tabindex). */
export function HourGrid({ hours, columns, isSelected, isDisabled, renderCell, onSelect, className, ...rest }: HourGridProps) {
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const focusNext = useRef(false);

  useEffect(() => {
    if (focusNext.current) {
      refs.current.get(`${pos[0]}:${pos[1]}`)?.focus();
      focusNext.current = false;
    }
  }, [pos]);

  const move = (e: KeyboardEvent, r: number, c: number) => {
    let nr = r;
    let nc = c;
    if (e.key === "ArrowDown") nr = Math.min(r + 1, hours.length - 1);
    else if (e.key === "ArrowUp") nr = Math.max(r - 1, 0);
    else if (e.key === "ArrowRight") nc = Math.min(c + 1, columns.length - 1);
    else if (e.key === "ArrowLeft") nc = Math.max(c - 1, 0);
    else if (e.key === "Home") nc = 0;
    else if (e.key === "End") nc = columns.length - 1;
    else return;
    e.preventDefault();
    focusNext.current = true;
    setPos([nr, nc]);
  };

  return (
    <div role="grid" aria-label={rest["aria-label"]} className={cn("overflow-x-auto", className)}>
      <div role="row" className="grid" style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(5rem, 1fr))` }}>
        <span role="columnheader" className="sr-only">
          Godzina
        </span>
        <span aria-hidden />
        {columns.map((c) => (
          <span key={c} role="columnheader" className="px-2 py-2 text-center text-xs font-bold uppercase text-[var(--text-muted)]">
            {c}
          </span>
        ))}
      </div>
      {hours.map((h, r) => (
        <div
          key={h}
          role="row"
          className="grid border-t border-[var(--grid)]"
          style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(5rem, 1fr))` }}
        >
          <span role="rowheader" className="px-2 py-3 text-sm tabular-nums text-[var(--text-muted)]">
            {h}
          </span>
          {columns.map((col, c) => {
            const sel = isSelected?.(r, c) ?? false;
            const dis = isDisabled?.(r, c) ?? false;
            return (
              <div key={col} role="gridcell" aria-selected={sel} className="p-0.5">
                <button
                  ref={(el) => {
                    if (el) refs.current.set(`${r}:${c}`, el);
                    else refs.current.delete(`${r}:${c}`);
                  }}
                  type="button"
                  tabIndex={pos[0] === r && pos[1] === c ? 0 : -1}
                  disabled={dis}
                  aria-label={`${h}, ${col}`}
                  onFocus={() => { setPos([r, c]); }}
                  onKeyDown={(e) => { move(e, r, c); }}
                  onClick={() => onSelect?.(r, c)}
                  className={cn(
                    "min-h-11 w-full rounded-[var(--radius-pole)] border text-sm tabular-nums",
                    sel
                      ? "border-[var(--zenit-zielen)] bg-[var(--zenit-zielen)] text-[var(--zenit-kosc)]"
                      : "border-transparent bg-[var(--surface-sunken)] hover:border-[var(--border)]",
                    dis && "opacity-40",
                    focusRing,
                  )}
                >
                  {renderCell?.(r, c)}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
