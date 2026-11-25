import { createAuthPort } from "@/server/auth-adapter";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";

export default async function HasloPage() {
  const auth = await createAuthPort();
  const session = await auth.getSession();
  if (!session) redirect("/logowanie");
  if (!session.mustChangePassword) redirect("/logowanie/mfa");

  return (
    <div className="auth-card">
      <h1 className="mb-2 text-[32px] font-extrabold leading-9 tracking-[-0.02em] text-[var(--zenit-kosc)]">Nowe hasło</h1>
      <p className="mb-8 text-[15px] text-[var(--auth-muted)]">
        Przy pierwszym logowaniu ustaw własne hasło (min. 12 znaków).
      </p>
      <PasswordForm />
    </div>
  );
}
