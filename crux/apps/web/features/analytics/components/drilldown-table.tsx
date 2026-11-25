"use client";

import { DataTable, formatNumber, type ColumnDef } from "@crux/ui";

export type OccupancyListRow = {
  readonly id: string;
  readonly date: string;
  readonly location: string;
  readonly chair: string;
  readonly provider: string;
  readonly category: string;
  readonly source: string;
  readonly minutes: number;
  readonly amountGrosze: number;
  readonly entries: number;
};

export type CapacityListRow = {
  readonly id: string;
  readonly date: string;
  readonly location: string;
  readonly chair: string;
  readonly open: number;
  readonly blocked: number;
  readonly available: number;
};

export type UnclosedListRow = { readonly id: string; readonly date: string; readonly location: string };

export type DrilldownLabels = {
  readonly date: string;
  readonly location: string;
  readonly chair: string;
  readonly provider: string;
  readonly category: string;
  readonly source: string;
  readonly minutes: string;
  readonly hours: string;
  readonly amount: string;
  readonly entries: string;
  readonly open: string;
  readonly blocked: string;
  readonly available: string;
  readonly empty: string;
  readonly caption: string;
};

const num = (v: number) => <span className="tabular-nums">{formatNumber(v)}</span>;
const dec = (v: number) => <span className="tabular-nums">{formatNumber(v, "dec1")}</span>;
const pln = (v: number) => <span className="tabular-nums">{formatNumber(v / 100, "dec2")}</span>;

export function OccupancyTable({ rows, labels }: { rows: OccupancyListRow[]; labels: DrilldownLabels }) {
  const columns: ColumnDef<OccupancyListRow>[] = [
    { accessorKey: "date", header: labels.date },
    { accessorKey: "location", header: labels.location },
    { accessorKey: "chair", header: labels.chair },
    { accessorKey: "provider", header: labels.provider },
    { accessorKey: "category", header: labels.category },
    { accessorKey: "source", header: labels.source },
    { accessorKey: "minutes", header: labels.minutes, cell: (c) => num(c.getValue<number>()) },
    { id: "hours", accessorFn: (r) => r.minutes / 60, header: labels.hours, cell: (c) => dec(c.getValue<number>()) },
    { accessorKey: "amountGrosze", header: labels.amount, cell: (c) => pln(c.getValue<number>()) },
    { accessorKey: "entries", header: labels.entries, cell: (c) => num(c.getValue<number>()) },
  ];
  return <DataTable data={rows} columns={columns} caption={labels.caption} emptyText={labels.empty} />;
}

export function CapacityTable({ rows, labels }: { rows: CapacityListRow[]; labels: DrilldownLabels }) {
  const columns: ColumnDef<CapacityListRow>[] = [
    { accessorKey: "date", header: labels.date },
    { accessorKey: "location", header: labels.location },
    { accessorKey: "chair", header: labels.chair },
    { accessorKey: "open", header: labels.open, cell: (c) => num(c.getValue<number>()) },
    { accessorKey: "blocked", header: labels.blocked, cell: (c) => num(c.getValue<number>()) },
    { accessorKey: "available", header: labels.available, cell: (c) => num(c.getValue<number>()) },
  ];
  return <DataTable data={rows} columns={columns} caption={labels.caption} emptyText={labels.empty} />;
}

export function UnclosedTable({ rows, labels }: { rows: UnclosedListRow[]; labels: DrilldownLabels }) {
  const columns: ColumnDef<UnclosedListRow>[] = [
    { accessorKey: "date", header: labels.date },
    { accessorKey: "location", header: labels.location },
  ];
  return <DataTable data={rows} columns={columns} caption={labels.caption} emptyText={labels.empty} />;
}
