import postgres from "postgres";
import type { DbHandle } from "./types";

export async function connectDb(url: string | undefined): Promise<DbHandle | null> {
  if (!url) return null;
  try {
    const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 3 });
    await sql`select 1`;
    return {
      async query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
        const rows = await sql.unsafe(text, params as never[]);
        return [...rows] as unknown as T[];
      },
      async end() {
        await sql.end({ timeout: 2 });
      },
    };
  } catch {
    return null;
  }
}
