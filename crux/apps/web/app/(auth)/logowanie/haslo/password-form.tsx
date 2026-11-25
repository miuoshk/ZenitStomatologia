"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthFormState } from "../../actions";

const initial: AuthFormState = { message: null };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nowe hasło
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Powtórz hasło
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)]"
        />
      </label>
      {state.message && (
        <p className="text-sm" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-pelne)] bg-[var(--zenit-zielen)] px-4 py-2.5 disabled:opacity-60"
      >
        {pending ? "Zapisywanie…" : "Zapisz hasło"}
      </button>
    </form>
  );
}
