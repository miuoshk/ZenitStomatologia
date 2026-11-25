import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { Card, CardHeader } from "@crux/ui";
import Link from "next/link";
import { createAuthPort } from "@/server/auth-adapter";
import { requireActor } from "@/server/with-actor";
import { OwnPasswordForm } from "./password-form";
import { ThemeToggle } from "./theme-toggle";

export default async function ProfilPage() {
  await requireActor();
  const session = await (await createAuthPort()).getSession();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.015em] text-[var(--text-primary)]">{L.profile.title}</h1>
      <Card>
        <CardHeader title={L.profile.password} />
        <OwnPasswordForm />
      </Card>
      <Card>
        <CardHeader title={L.profile.mfa} />
        <p className="text-sm">{session?.hasTotp ? L.profile.mfaActive : L.profile.mfaInactive}</p>
        <Link href="/logowanie/mfa" className="mt-2 inline-block text-[var(--link)] underline-offset-2 hover:underline">
          {L.profile.mfaLink}
        </Link>
      </Card>
      <Card>
        <CardHeader title={L.profile.theme} />
        <ThemeToggle />
      </Card>
    </div>
  );
}
