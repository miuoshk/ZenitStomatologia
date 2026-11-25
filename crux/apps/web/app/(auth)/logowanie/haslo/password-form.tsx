"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthFormState } from "../../actions";

const initial: AuthFormState = { message: null };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[var(--auth-muted)]">
        Nowe hasło
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="auth-field"
        />
      </label>
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[var(--auth-muted)]">
        Powtórz hasło
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="auth-field"
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
        className="auth-btn"
      >
        {pending ? "Zapisywanie…" : "Zapisz hasło"}
      </button>
    </form>
  );
}
