import { messageForDomainError } from "@crux/i18n";
import type { DomainError, Result } from "@crux/shared/result";

export type ActionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string; readonly type: DomainError["type"] };

export function toActionResult<T>(result: Result<T, DomainError>): ActionResult<T> {
  if (result.ok) return { ok: true, value: result.value };
  return {
    ok: false,
    message: messageForDomainError(result.error),
    type: result.error.type,
  };
}
