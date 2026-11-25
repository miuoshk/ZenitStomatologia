import { FIELD_CODE_PL, USTAWIENIA_LABELS, messageForDomainError } from "@crux/i18n";
import { isDbMappedError, type Actor, type Tx } from "@crux/db";
import type { DomainError, Result } from "@crux/shared/result";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";
import type { AdminState } from "./types";

export function failFrom(error: DomainError): NonNullable<AdminState> {
  const details = (error.details ?? {}) as { field?: unknown; code?: unknown };
  const field = typeof details.field === "string" ? details.field : undefined;
  const code = typeof details.code === "string" ? details.code : undefined;
  const msg = (code ? FIELD_CODE_PL[code] : undefined) ?? messageForDomainError(error);
  return {
    ok: false,
    message: msg,
    ...(field ? { fieldErrors: { [field]: msg } } : {}),
  };
}

export function fail(message: string, field?: string): NonNullable<AdminState> {
  return { ok: false, message, ...(field ? { fieldErrors: { [field]: message } } : {}) };
}

/** Uruchamia use-case w transakcji aktora; mapuje błędy na komunikaty PL (bez logowania sekretów). */
export async function runAdmin<T>(
  paths: readonly string[],
  fn: (tx: Tx, actor: Actor) => Promise<Result<T, DomainError>>,
  success: (value: T) => Omit<NonNullable<AdminState>, "ok">,
): Promise<NonNullable<AdminState>> {
  const actor = await requireActor();
  try {
    const result = await getDb().withActor(actor, (tx) => fn(tx, actor));
    if (!result.ok) return failFrom(result.error);
    for (const p of paths) revalidatePath(p);
    return { ok: true, ...success(result.value) };
  } catch (error) {
    if (isDbMappedError(error) && error.mapped.type !== "technical") {
      return failFrom(error.mapped);
    }
    return { ok: false, message: USTAWIENIA_LABELS.error };
  }
}
