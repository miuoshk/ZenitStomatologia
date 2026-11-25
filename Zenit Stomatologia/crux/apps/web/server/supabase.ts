import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./env";

/** Klient SSR z cookie sesji (Auth only — Data API wyłączone). */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // set z Server Component — proxy odświeży sesję.
        }
      },
    },
  });
}

/** Admin Auth (invite). Tylko server; bez Data API. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const secret = supabaseSecretKey();
  if (!secret) return null;
  return createClient(supabaseUrl(), secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
