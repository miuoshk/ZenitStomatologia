"use client";
import { useId, useMemo, useState, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatPhonePl, peselValid } from "../lib/format";
import { focusRing } from "./Button";

const fieldBase = cn(
  "w-full min-h-11 px-3.5 rounded-[var(--radius-input)] border border-[var(--border)]",
  "bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
  "disabled:opacity-50 aria-[invalid=true]:border-[var(--zenit-cegla)]",
  focusRing,
);

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
}

function FieldWrap({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-semibold text-[var(--text-secondary)]">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-sm text-[var(--status-krytyczne)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-sm text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describe(id: string, p: FieldProps) {
  return p.error || p.hint ? `${id}-msg` : undefined;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, className, id, ref, ...rest }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  const d = describe(fid, { hint, error } as FieldProps);
  return (
    <FieldWrap id={fid} {...({ label, hint, error } as FieldProps)}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={d}
        className={cn(fieldBase, className)}
        {...rest}
      />
    </FieldWrap>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">, FieldProps {
  options: SelectOption[];
  placeholder?: string;
}

/** Natywny select ze stylem marki (dostępność i mobilny picker za darmo). */
export function Select({ label, hint, error, options, placeholder, className, id, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} {...({ label, hint, error } as FieldProps)}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(fid, { hint, error } as FieldProps)}
        className={cn(fieldBase, "appearance-none pr-9", className)}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled ?? false}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

export interface ComboboxProps extends FieldProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

/** Prosta lista filtrowana (ARIA combobox + listbox). */
export function Combobox({ label, hint, error, options, value, onChange, placeholder, emptyText = "Brak wyników", className }: ComboboxProps) {
  const id = useId();
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pl");
    return q ? options.filter((o) => o.label.toLocaleLowerCase("pl").includes(q)) : options;
  }, [options, query]);

  const choose = (o: SelectOption) => {
    onChange(o.value);
    setQuery("");
    setOpen(false);
  };

  return (
    <FieldWrap id={id} {...({ label, hint, error } as FieldProps)}>
      <div className={cn("relative", className)}>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          className={fieldBase}
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? "")}
          onFocus={() => { setOpen(true); }}
          onBlur={() => { setOpen(false); }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open) {
              const o = shown[active];
              if (o) {
                e.preventDefault();
                choose(o);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open ? (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-card)] p-1 shadow-lg"
          >
            {shown.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">{emptyText}</li>
            ) : (
              shown.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  className={cn(
                    "cursor-pointer rounded-[var(--radius-pole)] px-3 py-2 text-[15px]",
                    i === active && "bg-[var(--surface-sunken)]",
                    o.value === value && "font-semibold",
                  )}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </FieldWrap>
  );
}

type NativeInput = Omit<InputProps, "type" | "value" | "onChange" | "defaultValue">;

export interface DatePickerProps extends NativeInput {
  /** ISO yyyy-mm-dd. */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
}

export function DatePicker({ value, onChange, ...rest }: DatePickerProps) {
  return <Input type="date" lang="pl" value={value} onChange={(e) => { onChange(e.target.value); }} {...rest} />;
}

export interface TimePickerProps extends NativeInput {
  /** HH:mm. */
  value: string;
  onChange: (hhmm: string) => void;
  /** Krok w minutach. */
  stepMinutes?: number;
}

export function TimePicker({ value, onChange, stepMinutes = 5, ...rest }: TimePickerProps) {
  return (
    <Input type="time" step={stepMinutes * 60} value={value} onChange={(e) => { onChange(e.target.value); }} {...rest} />
  );
}

export interface PhoneInputProps extends NativeInput {
  /** Same cyfry (9). */
  value: string;
  onChange: (digits: string) => void;
}

export function PhoneInput({ value, onChange, ...rest }: PhoneInputProps) {
  return (
    <div className="flex items-end gap-2">
      <span className="flex min-h-11 items-center rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 tabular-nums text-[var(--text-secondary)]">
        +48
      </span>
      <div className="flex-1">
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="tabular-nums"
          value={formatPhonePl(value)}
          onChange={(e) => { onChange(e.target.value.replace(/\D/g, "").slice(0, 9)); }}
          {...rest}
        />
      </div>
    </div>
  );
}

export interface PeselInputProps extends NativeInput {
  value: string;
  onChange: (digits: string) => void;
}

export function PeselInput({ value, onChange, error, ...rest }: PeselInputProps) {
  const invalid = value.length === 11 && !peselValid(value);
  const msg = error ?? (invalid ? "Nieprawidłowa suma kontrolna PESEL" : undefined);
  return (
    <Input
      inputMode="numeric"
      maxLength={11}
      autoComplete="off"
      className="tabular-nums"
      value={value}
      onChange={(e) => { onChange(e.target.value.replace(/\D/g, "").slice(0, 11)); }}
      {...(msg ? { error: msg } : {})}
      {...rest}
    />
  );
}
