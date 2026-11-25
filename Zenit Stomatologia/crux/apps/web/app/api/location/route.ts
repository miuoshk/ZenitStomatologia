import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCATION_COOKIE } from "@/server/cookies";
import { requireActor } from "@/server/with-actor";

export async function POST(request: Request): Promise<Response> {
  const actor = await requireActor();
  const body = (await request.json()) as { locationId?: string };
  const locationId = body.locationId;
  if (!locationId || !actor.locationIds.includes(locationId)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const jar = await cookies();
  jar.set(LOCATION_COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
  });
  return NextResponse.json({ ok: true });
}
