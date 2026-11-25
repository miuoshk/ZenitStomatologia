import { NextResponse } from "next/server";
import { createAuthPort } from "@/server/auth-adapter";
import { LOCK_COOKIE, LOCATION_COOKIE } from "@/server/cookies";
import { cookies } from "next/headers";

export async function POST(): Promise<Response> {
  const auth = await createAuthPort();
  await auth.signOut();
  const jar = await cookies();
  jar.delete(LOCK_COOKIE);
  jar.delete(LOCATION_COOKIE);
  return NextResponse.json({ ok: true });
}
