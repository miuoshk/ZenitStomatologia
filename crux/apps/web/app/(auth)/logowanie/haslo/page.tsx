import { createAuthPort } from "@/server/auth-adapter";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";

export default async function HasloPage() {
  const auth = await createAuthPort();
  const session = await auth.getSession();
  if (!session) redirect("/logowanie");
  if (!session.mustChangePassword) redirect("/logowanie/mfa");

  return (
    <div className="w-full max-w-md rounded-[var(--radius-karta)] bg-[var(--zenit-butelka)] p-8 text-[var(--zenit-krem)]">
      <h1 className="mb-1 text-xl font-medium">Nowe hasło</h1>
      <p className="mb-6 text-sm text-[var(--zenit-patyna)]">
        Przy pierwszym logowaniu ustaw własne hasło (min. 12 znaków).
      </p>
      <PasswordForm />
    </div>
  );
}
