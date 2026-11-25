import { createAuthPort, getTotpFactorId } from "@/server/auth-adapter";
import { redirect } from "next/navigation";
import { UnlockForm } from "./unlock-form";

/**
 * Blokada ekranu — wymaga sesji Auth. requireActor (DB) dopiero po odblokowaniu
 * w ścieżce (app); tu wystarczy cookie sesji + usunięcie crux.lock.
 */
export default async function ZablokowanyPage() {
  const auth = await createAuthPort();
  const session = await auth.getSession();
  if (!session) redirect("/logowanie");
  if (session.mustChangePassword) redirect("/logowanie/haslo");
  if (!session.hasTotp || session.aal !== "aal2") redirect("/logowanie/mfa");

  const factorId = (await getTotpFactorId()) ?? "";

  return (
    <div className="auth-card">
      <h1 className="mb-2 text-[32px] font-extrabold leading-9 tracking-[-0.02em] text-[var(--zenit-kosc)]">Ekran zablokowany</h1>
      <p className="mb-8 text-[15px] text-[var(--auth-muted)]">
        Odblokuj hasłem lub kodem MFA — stan aplikacji zostaje.
      </p>
      <UnlockForm factorId={factorId} />
    </div>
  );
}
