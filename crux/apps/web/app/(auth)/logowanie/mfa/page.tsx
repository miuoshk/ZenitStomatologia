import { createAuthPort, getTotpFactorId } from "@/server/auth-adapter";
import { redirect } from "next/navigation";
import { MfaForm } from "./mfa-form";

export default async function MfaPage() {
  const auth = await createAuthPort();
  const session = await auth.getSession();
  if (!session) redirect("/logowanie");
  if (session.mustChangePassword) redirect("/logowanie/haslo");

  let factorId = "";
  let qrCode: string | null = null;

  if (!session.hasTotp) {
    const enrolled = await auth.enrollTotp();
    if ("error" in enrolled) {
      return (
        <div className="auth-card">
          <p>Nie udało się rozpocząć rejestracji MFA.</p>
        </div>
      );
    }
    factorId = enrolled.factorId;
    qrCode = enrolled.qrCode;
  } else {
    factorId = (await getTotpFactorId()) ?? "";
  }

  return (
    <div className="auth-card">
      <h1 className="mb-2 text-[32px] font-extrabold leading-9 tracking-[-0.02em] text-[var(--zenit-kosc)]">
        {qrCode ? "Zarejestruj MFA" : "Kod MFA"}
      </h1>
      <p className="mb-8 text-[15px] text-[var(--auth-muted)]">
        {qrCode
          ? "Zeskanuj kod QR w aplikacji uwierzytelniającej, potem wpisz kod."
          : "Podaj kod z aplikacji uwierzytelniającej."}
      </p>
      {qrCode && (
        <img
          src={qrCode}
          alt="Kod QR MFA"
          className="mx-auto mb-6 h-48 w-48 rounded-[var(--radius-pole)] bg-white p-2"
        />
      )}
      <MfaForm factorId={factorId} />
    </div>
  );
}
