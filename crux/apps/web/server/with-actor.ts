import type { Actor, CruxDb } from "@crux/db";
import { resolveActor } from "@crux/identity";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { createAuthPort } from "./auth-adapter";
import { LOCATION_COOKIE, LOCK_COOKIE } from "./cookies";
import { getDb } from "./db";

export type RequireActorOptions = {
  /** Gdy true, nie przekierowuj przy lock (strona /zablokowany). */
  readonly allowLocked?: boolean;
};

/**
 * Odczyt sesji Supabase → resolveActor → Actor.
 * Brak sesji → /logowanie; aal1 / brak TOTP → /logowanie/mfa; must_change_password → /logowanie/haslo.
 */
export async function requireActor(options: RequireActorOptions = {}): Promise<Actor> {
  const auth = await createAuthPort();
  const session = await auth.getSession();
  if (!session) {
    redirect("/logowanie");
  }

  if (session.mustChangePassword) {
    redirect("/logowanie/haslo");
  }

  if (!session.hasTotp || session.aal !== "aal2") {
    redirect("/logowanie/mfa");
  }

  const jar = await cookies();
  if (!options.allowLocked && jar.get(LOCK_COOKIE)?.value === "1") {
    redirect("/zablokowany");
  }

  const locationCookie = jar.get(LOCATION_COOKIE)?.value ?? null;
  const activeLocationId =
    locationCookie && isUuid(locationCookie) ? locationCookie : null;

  const actor = await resolveActorAsApp(getDb(), session.userId, activeLocationId);
  if (!actor) {
    redirect("/logowanie?error=no_staff");
  }

  if (activeLocationId !== actor.activeLocationId) {
    jar.set(LOCATION_COOKIE, actor.activeLocationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env["NODE_ENV"] === "production",
    });
  }

  return actor;
}

/** Uruchamia use-case w `withActor` po `requireActor`. */
export async function withRequiredActor<T>(
  fn: (actor: Actor, db: CruxDb) => Promise<T>,
  options?: RequireActorOptions,
): Promise<T> {
  const actor = await requireActor(options);
  return fn(actor, getDb());
}

async function resolveActorAsApp(
  db: CruxDb,
  authUserId: string,
  activeLocationId: string | null,
): Promise<Actor | null> {
  // Połączenie crux_app bez SET ROLE authenticated — resolve_actor jest security definer.
  const result = await db.drizzle.transaction(async (tx) =>
    resolveActor(tx, authUserId, activeLocationId),
  );
  return result.ok ? result.value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Ping DB (health / smoke) — bez claims. */
export async function dbPing(): Promise<boolean> {
  try {
    await getDb().drizzle.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
