import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import type { Actor } from "@crux/db";
import { requireActor } from "@/server/with-actor";

/** Zwraca aktora, gdy ma uprawnienie; w przeciwnym razie null (strona renderuje <NoAccess />). */
export async function actorWith(permission: string): Promise<Actor | null> {
  const actor = await requireActor();
  return actor.permissions.includes(permission) ? actor : null;
}

export function NoAccess() {
  return (
    <div>
      <h1 className="text-2xl font-medium text-[var(--text-primary)]">{L.title}</h1>
      <p role="alert" className="mt-4 text-[var(--text-secondary)]">
        {L.forbidden}
      </p>
    </div>
  );
}
