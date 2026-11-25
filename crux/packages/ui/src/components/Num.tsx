import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatNumber, type NumFormat } from "../lib/format";

export interface NumProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number | null | undefined;
  format?: NumFormat;
  unit?: string;
  /** Pokaż znak + dla wartości dodatnich. */
  signed?: boolean;
}

export function Num({ value, format = "int", unit, signed = false, className, ...rest }: NumProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span className={cn("tabular-nums", className)} aria-label="brak danych" {...rest}>
        {"\u2014"}
      </span>
    );
  }
  const base = formatNumber(value, format);
  const text = `${signed && value > 0 ? "+" : ""}${base}${unit ? `\u00A0${unit}` : ""}`;
  return (
    <span className={cn("tabular-nums", className)} aria-label={text} {...rest}>
      {text}
    </span>
  );
}
