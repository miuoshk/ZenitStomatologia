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
    <div className="w-full max-w-md rounded-[var(--radius-karta)] bg-[var(--zenit-butelka)] p-8 text-[var(--zenit-krem)]">
      <h1 className="mb-1 text-xl font-medium">Ekran zablokowany</h1>
      <p className="mb-6 text-sm text-[var(--zenit-patyna)]">
        Odblokuj hasłem lub kodem MFA — stan aplikacji zostaje.
      </p>
      <UnlockForm factorId={factorId} />
    </div>
  );
}
