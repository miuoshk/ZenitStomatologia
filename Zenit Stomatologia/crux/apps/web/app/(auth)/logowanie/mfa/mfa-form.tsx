"use client";

import { useActionState } from "react";
import { verifyTotpAction, type AuthFormState } from "../../actions";

const initial: AuthFormState = { message: null };

export function MfaForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyTotpAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <label className="flex flex-col gap-1 text-sm">
        Kod
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="[0-9]{6}"
          className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)] tabular-nums"
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
        className="rounded-[var(--radius-pelne)] bg-[var(--zenit-zielen)] px-4 py-2.5 disabled:opacity-60"
      >
        {pending ? "Sprawdzanie…" : "Potwierdź"}
      </button>
    </form>
  );
}
