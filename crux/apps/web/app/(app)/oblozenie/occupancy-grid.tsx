"use client";

import { instantFromIso } from "@crux/shared/time";
import {
  OCCUPANCY_LABELS as L,
  OCCUPANCY_UI_CATEGORIES,
  formatGrosze,
} from "@crux/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import {
  closeDayAction,
  copyDayAction,
  recordOccupancyAction,
  reopenDayAction,
  voidOccupancyAction,
  type OccupancyActionState,
} from "./actions";

export type GridEntry = {
  id: string;
  hour: number;
  category: string;
  amountGrosze: string | null;
  note: string | null;
  source: string;
};
export type GridBlock = { id: string; startHour: number; endHour: number; kind: string };
export type GridChair = { id: string; name: string; entries: GridEntry[]; blocks: GridBlock[] };
export type GridData = {
  day: string;
  today: string;
  prevDay: string;
  nextDay: string;
  closedAllDay: boolean;
  opens: string | null;
  closes: string | null;
  dayClosed: boolean;
  chairs: GridChair[];
  can: { write: boolean; void: boolean; close: boolean; reopen: boolean; writeClosed: boolean };
};

const DEFAULT_OPEN = 8;
const DEFAULT_CLOSE = 20;

function hourOf(time: string | null, fallback: number, ceil: boolean): number {
  if (!time) return fallback;
  const [h, m] = time.split(":");
  const hh = Number(h);
  if (Number.isNaN(hh)) return fallback;
  return ceil && Number(m ?? 0) > 0 ? hh + 1 : hh;
}

function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

type Pos = { c: number; h: number };
type Editor =
  | { kind: "record"; c: number; from: number; to: number }
  | { kind: "void"; c: number; hour: number; entry: GridEntry };

/** Tło kolornika + pasek 4 px w kolorze krawędzi kategorii (F0-010, widok). Klasy w globals.css. */
const CATEGORY_STYLE: Record<string, string> = {
  Z1: "occ-cell occ-z1",
  Z2: "occ-cell occ-z2",
  Z3: "occ-cell occ-z3",
  Z4: "occ-cell occ-z4",
  Z5: "occ-cell occ-z5",
  "Z+": "occ-cell occ-zplus",
};

export function OccupancyGrid({ data }: { data: GridData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<OccupancyActionState | null>(null);
  const [focus, setFocus] = useState<Pos>({ c: 0, h: 0 });
  const [anchor, setAnchor] = useState<number | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  let startHour = hourOf(data.opens, DEFAULT_OPEN, false);
  let endHour = hourOf(data.closes, DEFAULT_CLOSE, true);
  if (data.closedAllDay || endHour <= startHour) {
    startHour = DEFAULT_OPEN;
    endHour = DEFAULT_CLOSE;
  }
  for (const ch of data.chairs) {
    for (const e of ch.entries) {
      startHour = Math.min(startHour, e.hour);
      endHour = Math.max(endHour, e.hour + 1);
    }
  }
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const opensH = hourOf(data.opens, DEFAULT_OPEN, false);
  const closesH = hourOf(data.closes, DEFAULT_CLOSE, true);
  const isOutside = (h: number) => data.closedAllDay || h < opensH || h >= closesH;

  const locked = data.dayClosed && !data.can.writeClosed;
  const editable = data.can.write && !locked;

  const entryAt = (c: number, h: number) => data.chairs[c]?.entries.find((e) => e.hour === h);
  const blockAt = (c: number, h: number) =>
    data.chairs[c]?.blocks.find((b) => h >= b.startHour && h < b.endHour);

  const lo = anchor === null ? focus.h : Math.min(anchor, focus.h);
  const hi = anchor === null ? focus.h : Math.max(anchor, focus.h);
  const inSelection = (c: number, h: number) => c === focus.c && h >= lo && h <= hi;

  function moveTo(next: Pos, extend: boolean) {
    const c = Math.max(0, Math.min(data.chairs.length - 1, next.c));
    const h = Math.max(startHour, Math.min(endHour - 1, next.h));
    if (extend && c === focus.c) setAnchor((a) => a ?? focus.h);
    else setAnchor(null);
    setFocus({ c, h });
    cellRefs.current.get(`${String(c)}:${String(h)}`)?.focus();
  }

  function refocus() {
    requestAnimationFrame(() => cellRefs.current.get(`${String(focus.c)}:${String(focus.h)}`)?.focus());
  }

  function exec(action: () => Promise<OccupancyActionState>, closeEditor = true) {
    startTransition(async () => {
      const r = await action();
      setStatus(r);
      if (r.ok) {
        if (closeEditor) setEditor(null);
        setAnchor(null);
        router.refresh();
        refocus();
      }
    });
  }

  function quickRecord(category: string) {
    const entries = Array.from({ length: hi - lo + 1 }, (_, i) => entryAt(focus.c, lo + i));
    const keep = entries.length === 1 ? entries[0] : undefined;
    const chair = data.chairs[focus.c];
    if (!chair) return;
    exec(
      () =>
        recordOccupancyAction({
          commandId: crypto.randomUUID(),
          chairId: chair.id,
          day: data.day,
          fromHour: lo,
          toHour: hi + 1,
          category,
          amount: keep?.amountGrosze ? (Number(keep.amountGrosze) / 100).toString() : "",
          note: keep?.note ?? "",
          overrideReason: "",
        }),
      false,
    );
  }

  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    if (pending) return;
    const { c, h } = focus;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveTo({ c, h: h + 1 }, e.shiftKey);
        return;
      case "ArrowUp":
        e.preventDefault();
        moveTo({ c, h: h - 1 }, e.shiftKey);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveTo({ c: c + 1, h }, false);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveTo({ c: c - 1, h }, false);
        return;
      case "Enter": {
        e.preventDefault();
        if (!editable || blockAt(c, h)) return;
        setEditor({ kind: "record", c, from: lo, to: hi + 1 });
        return;
      }
      case "Escape":
        setAnchor(null);
        setEditor(null);
        return;
      case "Backspace":
      case "Delete": {
        e.preventDefault();
        const entry = entryAt(c, h);
        if (entry && data.can.void && editable) setEditor({ kind: "void", c, hour: h, entry });
        return;
      }
      default: {
        if (/^[1-6]$/.test(e.key) && editable && !blockAt(c, h) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const cat = OCCUPANCY_UI_CATEGORIES[Number(e.key) - 1];
          if (cat) quickRecord(cat);
        }
      }
    }
  }

  const noChairs = data.chairs.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="mr-auto">
          <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{L.title}</h1>
          <p className="mt-1 text-[15px] first-letter:uppercase text-[var(--text-secondary)]">
            {new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(instantFromIso(`${data.day}T12:00:00Z`))}
          </p>
        </div>
        <nav aria-label={L.day} className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/oblozenie?dzien=${data.prevDay}`}
            className={iconBtnCls}
            aria-label={L.prevDay}
          >
            ←
          </Link>
          <form
            action={(fd) => {
              const d = fd.get("dzien");
              if (typeof d === "string" && d) router.push(`/oblozenie?dzien=${d}`);
            }}
            className="flex items-center gap-1"
          >
            <input
              type="date"
              name="dzien"
              defaultValue={data.day}
              aria-label={L.day}
              className="h-10 rounded-[var(--radius-pelne)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 font-semibold tabular-nums"
            />
            <button type="submit" className={ghostBtnCls}>
              {L.goToDay}
            </button>
          </form>
          <Link
            href={`/oblozenie?dzien=${data.nextDay}`}
            className={iconBtnCls}
            aria-label={L.nextDay}
          >
            →
          </Link>
          {data.day !== data.today && (
            <Link href="/oblozenie" className={ghostBtnCls}>
              {L.today}
            </Link>
          )}
          <Link
            href={`/oblozenie/tydzien?tydzien=${data.day}`}
            className={outlineBtnCls}
          >
            {L.weekView}
          </Link>
        </nav>
        {data.dayClosed && (
          <span
            data-testid="day-closed"
            className="inline-flex items-center gap-2 rounded-[var(--radius-pelne)] bg-[var(--status-dobrze-tlo)] px-3 py-1.5 text-[13px] font-bold text-[var(--status-dobrze)]"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {L.dayClosed}
          </span>
        )}
        {data.closedAllDay && (
          <span className="text-sm text-[var(--text-secondary)]">{L.locationClosed}</span>
        )}
      </div>

      <DayActions
        data={data}
        pending={pending}
        run={(a) => {
          exec(a, false);
        }}
      />

      {!data.can.write && <p className="text-sm text-[var(--text-secondary)]">{L.readOnly}</p>}
      {data.dayClosed && !data.can.writeClosed && (
        <p className="text-sm text-[var(--text-secondary)]">{L.dayClosedHint}</p>
      )}

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          data-testid="occupancy-status"
          className="text-sm text-[var(--text-primary)]"
        >
          {status.message}
        </p>
      )}

      {noChairs ? (
        <p className="text-[var(--text-secondary)]">{L.noChairs}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-karta)] border border-[var(--border)] bg-[var(--surface-card)] p-3">
          <div
            role="grid"
            aria-label={L.gridLabel}
            aria-readonly={!editable}
            tabIndex={-1}
            onKeyDown={onGridKey}
            className="inline-grid min-w-full gap-1"
            style={{ gridTemplateColumns: `4rem repeat(${String(data.chairs.length)}, minmax(9rem, 1fr))` }}
          >
            <div role="row" className="contents">
              <div role="columnheader" className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {L.hour}
              </div>
              {data.chairs.map((ch) => (
                <div key={ch.id} role="columnheader" className="flex items-center gap-2 px-2 pb-2 pt-1 text-[15px] font-extrabold">
                  {ch.name}
                  <span className="text-[12px] font-semibold text-[var(--text-muted)] tabular-nums">
                    {ch.entries.length} h
                  </span>
                </div>
              ))}
            </div>
            {hours.map((h) => (
              <div key={h} role="row" className="contents">
                <div role="rowheader" className="flex h-11 items-center px-2 text-[13px] font-semibold tabular-nums text-[var(--text-muted)]">
                  {hh(h)}
                </div>
                {data.chairs.map((ch, c) => {
                  const entry = entryAt(c, h);
                  const block = blockAt(c, h);
                  const isFocus = focus.c === c && focus.h === h;
                  const label = [
                    `${ch.name}, ${hh(h)}`,
                    entry
                      ? `${entry.category}${entry.amountGrosze ? `, ${formatGrosze(entry.amountGrosze)}` : ""}`
                      : block
                        ? L.blocked
                        : L.empty,
                    isOutside(h) ? L.outsideHours : "",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div key={ch.id} role="gridcell" aria-selected={inSelection(c, h)}>
                      <button
                        type="button"
                        ref={(el) => {
                          const k = `${String(c)}:${String(h)}`;
                          if (el) cellRefs.current.set(k, el);
                          else cellRefs.current.delete(k);
                        }}
                        tabIndex={isFocus || (focus.c === 0 && focus.h === 0 && c === 0 && h === startHour) ? 0 : -1}
                        aria-label={label}
                        data-testid={`cell-${String(c)}-${String(h)}`}
                        onFocus={() => {
                          setFocus((f) => (f.c === c && f.h === h ? f : { c, h }));
                          if (focus.c !== c) setAnchor(null);
                        }}
                        onClick={() => {
                          setAnchor(null);
                          setFocus({ c, h });
                          if (editable && !block) setEditor({ kind: "record", c, from: h, to: h + 1 });
                        }}
                        className={`flex h-11 w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)] ${
                          entry
                            ? (CATEGORY_STYLE[entry.category] ?? "occ-cell")
                            : block
                              ? "occ-block"
                              : isOutside(h)
                                ? "occ-outside"
                                : "occ-empty"
                        } ${inSelection(c, h) ? "ring-2 ring-inset ring-[var(--zenit-bursztyn)]" : ""}`}
                      >
                        {entry ? (
                          <>
                            <span className="font-bold">{entry.category}</span>
                            {entry.amountGrosze && (
                              <span className="font-semibold tabular-nums">{formatGrosze(entry.amountGrosze)}</span>
                            )}
                          </>
                        ) : block ? (
                          <span className="text-[var(--text-secondary)]">{L.blocked}</span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-secondary)]">{L.keyboardHelp}</p>

      {editor?.kind === "record" && data.chairs[editor.c] && (
        <RecordEditor
          key={`${String(editor.c)}-${String(editor.from)}-${String(editor.to)}`}
          chair={data.chairs[editor.c] as GridChair}
          from={editor.from}
          to={editor.to}
          existing={editor.to - editor.from === 1 ? entryAt(editor.c, editor.from) : undefined}
          outside={Array.from({ length: editor.to - editor.from }, (_, i) => editor.from + i).some(isOutside)}
          pending={pending}
          maxHour={24}
          onCancel={() => {
            setEditor(null);
            refocus();
          }}
          onSubmit={(v) => {
            exec(() =>
              recordOccupancyAction({
                commandId: crypto.randomUUID(),
                chairId: (data.chairs[editor.c] as GridChair).id,
                day: data.day,
                ...v,
              }),
            );
          }}
        />
      )}
      {editor?.kind === "void" && (
        <VoidEditor
          entry={editor.entry}
          pending={pending}
          onCancel={() => {
            setEditor(null);
            refocus();
          }}
          onSubmit={(reason) => {
            exec(() =>
              voidOccupancyAction({
                commandId: crypto.randomUUID(),
                entryId: editor.entry.id,
                reason,
              }),
            );
          }}
        />
      )}
    </div>
  );
}

const inputCls =
  "min-h-11 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-3.5 text-[15px]";
const btnCls =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-pelne)] bg-[var(--action-bg)] px-5 text-[15px] font-semibold text-[var(--action-fg)] transition-colors hover:bg-[var(--action-bg-hover)] disabled:opacity-60";
const outlineBtnCls =
  "inline-flex h-10 items-center rounded-[var(--radius-pelne)] border border-[var(--border-strong)] px-4 font-semibold transition-colors hover:bg-[var(--surface-sunken)]";
const ghostBtnCls =
  "inline-flex h-10 items-center rounded-[var(--radius-pelne)] px-3 font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]";
const iconBtnCls =
  "grid size-10 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] font-semibold transition-colors hover:bg-[var(--surface-sunken)]";

function RecordEditor(props: {
  chair: GridChair;
  from: number;
  to: number;
  existing: GridEntry | undefined;
  outside: boolean;
  pending: boolean;
  maxHour: number;
  onCancel: () => void;
  onSubmit: (v: {
    fromHour: number;
    toHour: number;
    category: string;
    amount: string;
    note: string;
    overrideReason: string;
  }) => void;
}) {
  const { existing } = props;
  const [category, setCategory] = useState(existing?.category ?? "Z1");
  const [amount, setAmount] = useState(
    existing?.amountGrosze ? (Number(existing.amountGrosze) / 100).toString().replace(".", ",") : "",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(props.from);
  const [to, setTo] = useState(props.to);

  return (
    <section
      aria-label={L.editorTitle}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          props.onCancel();
        }
      }}
      className="max-w-xl rounded-[var(--radius-karta,0.75rem)] border border-[var(--zenit-mech)] p-4"
    >
      <h2 className="mb-3 text-lg font-medium">
        {L.editorTitle}: {props.chair.name}
      </h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit({ fromHour: from, toHour: to, category, amount, note, overrideReason: reason });
        }}
      >
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {L.fromHour}
            <select
              value={from}
              onChange={(e) => {
                setFrom(Number(e.target.value));
              }}
              className={inputCls}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hh(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {L.toHour}
            <select
              value={to}
              onChange={(e) => {
                setTo(Number(e.target.value));
              }}
              className={inputCls}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {hh(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          {L.category}
          <select
            autoFocus
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
            className={inputCls}
          >
            {OCCUPANCY_UI_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {L.amount}
          <input
            value={amount}
            inputMode="decimal"
            placeholder={L.amountHint}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            className={`${inputCls} tabular-nums`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {L.note}
          <input
            value={note}
            maxLength={80}
            onChange={(e) => {
              setNote(e.target.value);
            }}
            className={inputCls}
          />
        </label>
        {props.outside && (
          <label className="flex flex-col gap-1 text-sm">
            {L.overrideReason}
            <input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
              className={inputCls}
            />
          </label>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={props.pending} className={btnCls}>
            {props.pending ? L.saving : L.save}
          </button>
          <button type="button" onClick={props.onCancel} className={btnCls}>
            {L.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}

function VoidEditor(props: {
  entry: GridEntry;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <section
      aria-label={L.voidEntry}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          props.onCancel();
        }
      }}
      className="max-w-xl rounded-[var(--radius-karta,0.75rem)] border border-[var(--zenit-mech)] p-4"
    >
      <h2 className="mb-3 text-lg font-medium">
        {L.voidEntry} ({props.entry.category})
      </h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit(reason);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          {L.voidReason}
          <input
            autoFocus
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
            className={inputCls}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={props.pending} className={btnCls}>
            {L.voidConfirm}
          </button>
          <button type="button" onClick={props.onCancel} className={btnCls}>
            {L.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}

function DayActions({
  data,
  pending,
  run,
}: {
  data: GridData;
  pending: boolean;
  run: (a: () => Promise<OccupancyActionState>) => void;
}) {
  const [copyFrom, setCopyFrom] = useState(data.prevDay);
  const [reopenReason, setReopenReason] = useState("");
  const showCopy = data.can.write && !data.dayClosed;
  return (
    <div className="flex flex-wrap items-end gap-4">
      {showCopy && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              copyDayAction({ commandId: crypto.randomUUID(), fromDay: copyFrom, toDay: data.day }),
            );
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            {L.copyFrom}
            <input
              type="date"
              value={copyFrom}
              onChange={(e) => {
                setCopyFrom(e.target.value);
              }}
              className={inputCls}
            />
          </label>
          <button type="submit" disabled={pending} className={btnCls}>
            {L.copyConfirm}
          </button>
        </form>
      )}
      {data.can.close && !data.dayClosed && (
        <button
          type="button"
          disabled={pending}
          className={btnCls}
          onClick={() => {
            run(() => closeDayAction({ commandId: crypto.randomUUID(), day: data.day }));
          }}
        >
          {L.closeDay}
        </button>
      )}
      {data.can.reopen && data.dayClosed && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              reopenDayAction({
                commandId: crypto.randomUUID(),
                day: data.day,
                reason: reopenReason,
              }),
            );
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            {L.reopenReason}
            <input
              required
              value={reopenReason}
              onChange={(e) => {
                setReopenReason(e.target.value);
              }}
              className={inputCls}
            />
          </label>
          <button type="submit" disabled={pending} className={btnCls}>
            {L.reopenDay}
          </button>
        </form>
      )}
    </div>
  );
}
