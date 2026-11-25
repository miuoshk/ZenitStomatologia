"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { Button, Input, Select, type InputProps, type SelectProps } from "@crux/ui";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { AdminState } from "./types";

const ErrorsContext = createContext<Readonly<Record<string, string>>>({});

type Props = {
  action: (formData: FormData) => Promise<AdminState>;
  children: ReactNode;
  submitLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  /** Wyczyść pola po udanym zapisie (formularze „dodaj”). Przy błędzie wartości zostają. */
  resetOnSuccess?: boolean;
  className?: string;
  testId?: string;
  confirm?: string;
};

/**
 * Formularz administracyjny: etykieta nad polem, błędy pól, Ctrl+Enter, wartości zostają po błędzie
 * (submit przez JS — bez resetu formularza Reacta).
 */
export function AdminForm({
  action,
  children,
  submitLabel = L.save,
  variant = "primary",
  resetOnSuccess = false,
  className,
  testId,
  confirm,
}: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, setState] = useState<AdminState>(null);
  const [pending, start] = useTransition();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const next = await action(formData);
      setState(next);
      if (next?.ok) {
        if (resetOnSuccess) ref.current?.reset();
        router.refresh();
      }
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      ref.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={ref}
      onSubmit={submit}
      onKeyDown={onKeyDown}
      className={className ?? "flex flex-col gap-4"}
      data-testid={testId}
      noValidate
    >
      <ErrorsContext value={state?.fieldErrors ?? {}}>{children}</ErrorsContext>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? L.saving : submitLabel}
        </Button>
        <span className="text-xs text-[var(--text-muted)]">{L.submitHint}</span>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-[var(--status-krytyczne)]">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-[var(--status-dobrze)]">
          {state.message}
        </p>
      )}
      {state?.ok && state.secret ? (
        <SecretBox
          secret={state.secret}
          onDismiss={() => {
            setState({ ok: true, message: state.message });
          }}
        />
      ) : null}
    </form>
  );
}

function SecretBox({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      data-testid="one-time-secret"
      className="rounded-[var(--radius-karta)] border border-[var(--zenit-bursztyn)] bg-[var(--surface-sunken)] p-4"
    >
      <p className="text-sm font-semibold">{L.staff.inviteResult}</p>
      <code className="mt-2 block select-all break-all text-lg tabular-nums">{secret}</code>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(secret);
          }}
        >
          {L.staff.copy}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {L.staff.dismiss}
        </Button>
      </div>
    </div>
  );
}

/** Input z błędem pola z kontekstu formularza. */
export function Field({ name, ...rest }: InputProps & { name: string }) {
  const errors = useContext(ErrorsContext);
  const error = errors[name];
  return <Input name={name} {...rest} {...(error ? { error } : {})} />;
}

export function SelectField({ name, ...rest }: SelectProps & { name: string }) {
  const errors = useContext(ErrorsContext);
  const error = errors[name];
  return <Select name={name} {...rest} {...(error ? { error } : {})} />;
}

/** Prosty przycisk-akcja (bez pól), np. „Ponów”, „Przełącz”. */
export function ActionButton({
  action,
  label,
  variant = "secondary",
  confirm,
  testId,
}: {
  action: () => Promise<AdminState>;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string;
  testId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminState>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size="sm"
        variant={variant}
        disabled={pending}
        {...(testId ? { "data-testid": testId } : {})}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const next = await action();
            setState(next);
            if (next?.ok) router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {state && !state.ok ? (
        <span role="alert" className="text-xs text-[var(--status-krytyczne)]">
          {state.message}
        </span>
      ) : null}
    </span>
  );
}
