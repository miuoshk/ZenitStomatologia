import { PULPIT_LABELS as L } from "@crux/i18n";
import { Card, CardHeader } from "@crux/ui";
import type { ReactNode } from "react";
import { CardError } from "../errors";

/** Szkielet ładowania: przyciemniona karta (bez pustego migotania). */
export function CardSkeleton({ title, tile = false }: { title?: string; tile?: boolean }) {
  return (
    <Card
      aria-busy="true"
      aria-label={title ? `${title}: ${L.loading}` : L.loading}
      className={tile ? "p-5 opacity-50" : "opacity-50"}
    >
      {title ? <CardHeader title={title} /> : null}
      <div className="animate-pulse space-y-3">
        <div className={tile ? "h-9 w-24 rounded bg-[var(--surface-sunken)]" : "h-40 w-full rounded bg-[var(--surface-sunken)]"} />
        {tile ? null : <div className="h-3 w-1/2 rounded bg-[var(--surface-sunken)]" />}
      </div>
    </Card>
  );
}

export function EmptyCard({ title, hint, text = L.empty }: { title: string; hint?: string; text?: string }) {
  return (
    <Card>
      <CardHeader title={title} {...(hint ? { hint } : {})} />
      <p className="text-[var(--text-secondary)]">{text}</p>
    </Card>
  );
}

export function ErrorCard({ title, href, forbidden = false }: { title: string; href: string; forbidden?: boolean }) {
  return (
    <Card role="alert">
      <CardHeader title={title} />
      <p className="text-[var(--text-secondary)]">{forbidden ? L.forbidden : L.error}</p>
      {forbidden ? null : (
        <a
          href={href}
          className="mt-3 inline-flex min-h-9 items-center rounded-[var(--radius-pelne)] border border-[var(--border)] px-3.5 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          {L.retry}
        </a>
      )}
    </Card>
  );
}

/** Błąd w jednej karcie nie wywraca strony: karta z komunikatem i „Spróbuj ponownie”. */
export async function guarded(
  title: string,
  href: string,
  fn: () => Promise<ReactNode>,
): Promise<ReactNode> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CardError && e.kind === "forbidden") {
      return <ErrorCard title={title} href={href} forbidden />;
    }
    return <ErrorCard title={title} href={href} />;
  }
}
