import type { ReactNode } from "react";

/**
 * Ekrany logowania: butelka, ryciny zielnika jako faktura w rogach (maska CSS, kolor z tokenu),
 * znak Crux nad kartą. Wzór: kursnaldek.pl (ciemny motyw, krem na butelce).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <span aria-hidden className="auth-rycina auth-rycina--a" />
      <span aria-hidden className="auth-rycina auth-rycina--b" />
      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
        <img src="/brand/logo/crux-poziomy-krem.svg" alt="Crux" className="mb-10 h-12" />
        {children}
        <p className="mt-8 text-center text-[13px] text-[var(--auth-muted)]">
          System gabinetów zenit.stomatologia · tylko dla personelu
        </p>
      </div>
    </div>
  );
}
