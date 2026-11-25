"use client";
import * as RadixDialog from "@radix-ui/react-dialog";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Input } from "./fields";
import { StatusPill } from "./display";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const overlay = "fixed inset-0 z-40 bg-[var(--zenit-butelka)]/50";

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlay} />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius-karta)] bg-[var(--surface-card)] p-6 text-[var(--text-primary)] shadow-xl",
            className,
          )}
        >
          <RadixDialog.Title className="text-lg font-bold">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm text-[var(--text-muted)]">{description}</RadixDialog.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  reasonLabel?: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
}

/** Potwierdzenie z obowiązkowym powodem. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  reasonLabel = "Powód",
  danger = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const ok = reason.trim().length > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("");
        onOpenChange(o);
      }}
      title={title}
      {...(description ? { description } : {})}
      footer={
        <>
          <Button variant="ghost" onClick={() => { onOpenChange(false); }}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            disabled={!ok}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Input label={reasonLabel} required value={reason} onChange={(e) => { setReason(e.target.value); }} />
    </Dialog>
  );
}

export interface SidePanelProps extends Omit<DialogProps, "className"> {
  side?: "right" | "left";
}

export function SidePanel({ open, onOpenChange, title, description, children, footer, side = "right" }: SidePanelProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlay} />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed top-0 z-50 flex h-full w-[min(92vw,26rem)] flex-col bg-[var(--surface-card)] p-6 text-[var(--text-primary)] shadow-xl",
            side === "right" ? "right-0" : "left-0",
          )}
        >
          <RadixDialog.Title className="text-lg font-bold">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm text-[var(--text-muted)]">{description}</RadixDialog.Description>
          ) : null}
          <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
          {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

type ToastStatus = "dobrze" | "uwaga" | "powazne" | "krytyczne";
interface ToastItem {
  id: number;
  message: string;
  status: ToastStatus;
}
interface ToastApi {
  toast: (message: string, status?: ToastStatus) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast wymaga <ToastProvider>");
  return ctx;
}

let toastSeq = 0;

/** Proste toasty w portalu (aria-live). */
export function ToastProvider({ children, durationMs = 5000 }: { children: ReactNode; durationMs?: number }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback(
    (message: string, status: ToastStatus = "dobrze") => {
      const id = ++toastSeq;
      setItems((l) => [...l, { id, message, status }]);
      setTimeout(() => { setItems((l) => l.filter((t) => t.id !== id)); }, durationMs);
    },
    [durationMs],
  );
  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
              {items.map((t) => (
                <Toast key={t.id} status={t.status} onDismiss={() => { setItems((l) => l.filter((x) => x.id !== t.id)); }}>
                  {t.message}
                </Toast>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export interface ToastProps {
  status?: ToastStatus;
  children: ReactNode;
  onDismiss?: () => void;
}

export function Toast({ status = "dobrze", children, onDismiss }: ToastProps) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-[15px] text-[var(--text-primary)] shadow-lg">
      <StatusPill status={status}>{status}</StatusPill>
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" aria-label="Zamknij" onClick={onDismiss} className="ml-2 text-[var(--text-muted)]">
          {"\u00D7"}
        </button>
      ) : null}
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Nazwa rycina z brand/ryciny (np. "lawenda"). */
  rycina?: string;
  basePath?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, rycina, basePath = "/brand", action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {rycina ? <img src={`${basePath}/ryciny/${rycina}.svg`} alt="" aria-hidden className="h-24 opacity-80" /> : null}
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}
