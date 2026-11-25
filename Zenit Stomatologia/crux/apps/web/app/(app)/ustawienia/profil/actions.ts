"use server";

import { AUTH_MESSAGES, USTAWIENIA_LABELS as L } from "@crux/i18n";
import { fail } from "@/features/settings/run";
import type { AdminState } from "@/features/settings/types";
import { createAuthPort } from "@/server/auth-adapter";
import { formString } from "@/server/form";
import { requireActor } from "@/server/with-actor";

/** Zmiana hasła zalogowanego użytkownika (AuthPort.changePassword). Hasła nie są logowane. */
export async function changeOwnPasswordAction(fd: FormData): Promise<AdminState> {
  await requireActor();
  const password = formString(fd, "password");
  if (password !== formString(fd, "confirm")) return fail(L.profile.passwordMismatch, "confirm");
  const result = await (await createAuthPort()).changePassword({ newPassword: password });
  if ("error" in result) {
    return fail(
      result.error === "weak_password" ? AUTH_MESSAGES.weak_password : AUTH_MESSAGES.technical,
      result.error === "weak_password" ? "password" : undefined,
    );
  }
  return { ok: true, message: L.profile.passwordChanged };
}
