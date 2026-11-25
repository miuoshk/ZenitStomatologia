import { CruxLogo } from "@crux/ui/crux-logo";
import { LoginForm } from "./login-form";

export default function LogowaniePage() {
  return (
    <div className="w-full max-w-md rounded-[var(--radius-karta)] bg-[var(--zenit-butelka)] p-8 text-[var(--zenit-krem)]">
      <div className="mb-8 flex items-center gap-4">
        <img
          src="/brand/logo/crux-poziomy-krem.svg"
          alt="Crux"
          height={58}
          className="h-[58px]"
        />
        <CruxLogo size={48} animate className="text-[var(--zenit-krem)]" />
        <img
          src="/brand/ryciny/szalwia.svg"
          alt=""
          aria-hidden
          className="ml-auto h-16 w-16 text-[var(--zenit-krem)] [filter:invert(92%)_sepia(18%)_saturate(400%)_hue-rotate(358deg)_brightness(95%)]"
        />
      </div>
      <h1 className="mb-1 text-xl font-medium">Logowanie</h1>
      <p className="mb-6 text-sm text-[var(--zenit-patyna)]">
        Personel zenit.stomatologia
      </p>
      <LoginForm />
    </div>
  );
}
