"use client";

import { useActionState } from "react";
import { verifyTotpAction, type AuthFormState } from "../../actions";

const initial: AuthFormState = { message: null };

export function MfaForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyTotpAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="factorId" value={factorId} />
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[var(--auth-muted)]">
        Kod
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="[0-9]{6}"
          className="auth-field tabular-nums tracking-[0.3em]"
        />
      </label>
      {state.message && (
        <p className="text-sm" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !factorId}
        className="auth-btn"
      >
        {pending ? "Sprawdzanie…" : "Potwierdź"}
      </button>
    </form>
  );
}
