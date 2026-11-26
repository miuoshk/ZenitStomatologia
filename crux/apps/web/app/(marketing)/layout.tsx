import type { ReactNode } from "react";

/** Public patient surface — no Crux shell, no staff chrome (ADR-033). */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--zenit-kosc)] text-[var(--zenit-butelka)]">
      {children}
    </div>
  );
}
