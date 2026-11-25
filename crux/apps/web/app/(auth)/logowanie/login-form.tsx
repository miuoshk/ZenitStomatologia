"use client";

import { useActionState } from "react";
import { signInAction, type AuthFormState } from "../actions";

const initial: AuthFormState = { message: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hasło
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)]"
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
        className="mt-2 rounded-[var(--radius-pelne)] bg-[var(--zenit-zielen)] px-4 py-2.5 text-[var(--zenit-krem)] disabled:opacity-60"
      >
        {pending ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}
