"use client";

import { useActionState, useState } from "react";
import { unlockAction, type AuthFormState } from "../actions";

const initial: AuthFormState = { message: null };

export function UnlockForm({ factorId }: { factorId: string }) {
  const [mode, setMode] = useState<"password" | "totp">("password");
  const [state, action, pending] = useActionState(unlockAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="factorId" value={factorId} />
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-[var(--radius-pelne)] px-3 py-1 ${mode === "password" ? "bg-[var(--zenit-zielen)]" : "hover:bg-white/10"}`}
          onClick={() => {
            setMode("password");
          }}
        >
          Hasło
        </button>
        <button
          type="button"
          className={`rounded-[var(--radius-pelne)] px-3 py-1 ${mode === "totp" ? "bg-[var(--zenit-zielen)]" : "hover:bg-white/10"}`}
          onClick={() => {
            setMode("totp");
          }}
        >
          MFA
        </button>
      </div>
      {mode === "password" ? (
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
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Kod MFA
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="rounded-[var(--radius-input)] border border-[var(--zenit-mech)] bg-[var(--zenit-zielen)] px-3 py-2 text-[var(--zenit-krem)] tabular-nums"
          />
        </label>
      )}
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
        {pending ? "Odblokowywanie…" : "Odblokuj"}
      </button>
    </form>
  );
}
