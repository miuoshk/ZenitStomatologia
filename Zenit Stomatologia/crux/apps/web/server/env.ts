/** Env dla cienkiej warstwy Auth (K07). Bez sekretów w logach. */

export function supabaseUrl(): string {
  const url = process.env["SUPABASE_URL"];
  if (!url) throw new Error("SUPABASE_URL missing");
  return url;
}

export function supabasePublishableKey(): string {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY missing");
  return key;
}

/** Klucz Admin Auth (tworzenie kont). Nie logować. */
export function supabaseSecretKey(): string | null {
  return process.env["SUPABASE_SECRET_KEY"] ?? null;
}

export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL missing");
  return url;
}

/** Idle lock (ms). Domyślnie 5 min; e2e: CRUX_IDLE_LOCK_MS. */
export function idleLockMs(): number {
  const raw = process.env["CRUX_IDLE_LOCK_MS"];
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 5 * 60 * 1000;
}
