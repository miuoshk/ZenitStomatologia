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
        <div className="rounded-[var(--radius-karta)] bg-[var(--zenit-butelka)] p-8 text-[var(--zenit-krem)]">
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
    <div className="w-full max-w-md rounded-[var(--radius-karta)] bg-[var(--zenit-butelka)] p-8 text-[var(--zenit-krem)]">
      <h1 className="mb-1 text-xl font-medium">
        {qrCode ? "Zarejestruj MFA" : "Kod MFA"}
      </h1>
      <p className="mb-6 text-sm text-[var(--zenit-patyna)]">
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
