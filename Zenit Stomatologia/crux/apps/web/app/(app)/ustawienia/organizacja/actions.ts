"use server";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import {
  COLOR_POOL,
  createChair,
  createLocation,
  replaceWeeklyHours,
  updateChair,
  updateLocation,
  upsertOpeningException,
} from "@crux/org";
import { fail, runAdmin } from "@/features/settings/run";
import type { AdminState } from "@/features/settings/types";
import { formString } from "@/server/form";

const PATH = "/ustawienia/organizacja";
type Color = (typeof COLOR_POOL)[number];

function color(raw: string): Color | undefined {
  return COLOR_POOL.find((c) => c === raw);
}

function address(fd: FormData): Record<string, unknown> {
  return {
    street: formString(fd, "street").trim(),
    city: formString(fd, "city").trim(),
    postcode: formString(fd, "postcode").trim(),
  };
}

function optional(fd: FormData, key: string): string | undefined {
  const v = formString(fd, key).trim();
  return v === "" ? undefined : v;
}

export async function saveLocationAction(fd: FormData): Promise<AdminState> {
  const id = formString(fd, "id");
  const name = formString(fd, "name").trim();
  if (name === "") return fail("To pole jest wymagane.", "name");
  const colorKey = color(formString(fd, "colorKey"));
  const phone = optional(fd, "phone");
  const email = optional(fd, "email");
  if (id) {
    return runAdmin(
      [PATH],
      (tx, actor) =>
        updateLocation(tx, actor, id, {
          name,
          address: address(fd),
          phone: phone ?? "",
          email: email ?? "",
          openedOn: optional(fd, "openedOn") ?? null,
          active: formString(fd, "active") === "on",
          ...(colorKey ? { colorKey } : {}),
        }),
      () => ({ message: L.saved }),
    );
  }
  return runAdmin(
    [PATH],
    (tx, actor) =>
      createLocation(tx, actor, {
        number: formString(fd, "number").trim(),
        name,
        address: address(fd),
        ...(colorKey ? { colorKey } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      }),
    () => ({ message: L.saved }),
  );
}

export async function addChairAction(fd: FormData): Promise<AdminState> {
  const name = formString(fd, "name").trim();
  if (name === "") return fail("To pole jest wymagane.", "name");
  const position = Number(formString(fd, "position", "1"));
  if (!Number.isInteger(position) || position < 1) return fail("Podaj liczbę całkowitą ≥ 1.", "position");
  return runAdmin(
    [PATH],
    (tx, actor) =>
      createChair(tx, actor, {
        locationId: formString(fd, "locationId"),
        name,
        position,
        equipment: fd.getAll("equipment").filter((v): v is string => typeof v === "string"),
      }),
    () => ({ message: L.saved }),
  );
}

export async function updateChairAction(
  chairId: string,
  patch: { name?: string; position?: number; equipment?: string[]; active?: boolean },
): Promise<AdminState> {
  return runAdmin(
    [PATH],
    (tx, actor) => updateChair(tx, actor, chairId, patch),
    () => ({ message: L.saved }),
  );
}

export async function saveHoursAction(fd: FormData): Promise<AdminState> {
  const hours = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const opens = formString(fd, `opens-${String(d)}`);
    const closes = formString(fd, `closes-${String(d)}`);
    return opens && closes ? { weekday: d, opens, closes } : null;
  });
  const validFrom = formString(fd, "validFrom");
  return runAdmin(
    [PATH],
    (tx, actor) => replaceWeeklyHours(tx, actor, { locationId: formString(fd, "locationId"), validFrom, hours }),
    () => ({ message: L.saved }),
  );
}

export async function saveExceptionAction(fd: FormData): Promise<AdminState> {
  const closed = formString(fd, "closed") === "on";
  const opens = optional(fd, "opens");
  const closes = optional(fd, "closes");
  const reason = optional(fd, "reason");
  return runAdmin(
    [PATH],
    (tx, actor) =>
      upsertOpeningException(tx, actor, {
        locationId: formString(fd, "locationId"),
        day: formString(fd, "day"),
        closed,
        ...(opens ? { opens } : {}),
        ...(closes ? { closes } : {}),
        ...(reason ? { reason } : {}),
      }),
    () => ({ message: L.saved }),
  );
}
