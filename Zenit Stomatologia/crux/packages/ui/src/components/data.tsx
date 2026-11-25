"use client";
import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
export type { ColumnDef } from "@tanstack/react-table";
import { cn } from "../lib/cn";
import { focusRing } from "./Button";

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="toolbar"
      aria-label="Filtry"
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-[var(--radius-karta)] border border-[var(--border)] bg-[var(--surface-card)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]";
const td = "px-3 py-2.5 text-[15px]";

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  caption?: string;
  emptyText?: string;
  className?: string;
}

/** Cienka nakładka na TanStack Table: sortowanie po nagłówku. */
export function DataTable<T>({ data, columns, caption, emptyText = "Brak danych", className }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse tabular-nums">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-[var(--border)]">
              {hg.headers.map((h) => {
                const dir = h.column.getIsSorted();
                return (
                  <th key={h.id} scope="col" className={th} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1 uppercase", focusRing)}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden>{dir === "asc" ? "\u2191" : dir === "desc" ? "\u2193" : ""}</span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={cn(td, "text-center text-[var(--text-muted)]")}>
                {emptyText}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--grid)] last:border-0">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className={td}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface TableViewProps {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
  className?: string;
}

/** Prosta tabela - tekstowy odpowiednik wykresu. */
export function TableView({ caption, columns, rows, className }: TableViewProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((c) => (
              <th key={c} scope="col" className={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--grid)] last:border-0">
              {r.map((cell, j) => (
                <td key={j} className={td}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
