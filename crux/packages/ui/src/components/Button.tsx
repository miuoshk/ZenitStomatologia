"use client";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../lib/cn";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-semibold select-none",
    "rounded-[var(--radius-pelne)] transition-colors duration-150 active:scale-[0.98]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "min-h-11 px-5 text-[15px]",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--action-bg)] text-[var(--action-fg)] hover:bg-[var(--action-bg-hover)]",
        secondary:
          "bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]",
        ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]",
        danger: "bg-[var(--zenit-cegla)] text-[var(--zenit-kosc)] hover:bg-[var(--status-krytyczne)]",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "",
        lg: "min-h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, type = "button", ref, ...rest }: ButtonProps) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...rest} />;
}
