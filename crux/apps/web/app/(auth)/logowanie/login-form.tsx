"use client";

import { useActionState } from "react";
import { signInAction, type AuthFormState } from "../actions";

const initial: AuthFormState = { message: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[var(--auth-muted)]">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="auth-field"
        />
      </label>
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[var(--auth-muted)]">
        Hasło
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="auth-field"
        />
      </label>
      {state.message && (
        <p className="text-sm text-[var(--zenit-krem)]" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="auth-btn mt-2"
      >
        {pending ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}
