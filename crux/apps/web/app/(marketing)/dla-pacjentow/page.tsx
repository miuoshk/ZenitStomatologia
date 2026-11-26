import { MARKETING_LABELS } from "@crux/i18n";
import Image from "next/image";

export default function DlaPacjentowPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <Image
        src="/brand/logo/zenit-poziomy-zielen.svg"
        alt={MARKETING_LABELS.brand}
        width={220}
        height={48}
        priority
      />
      <div className="flex flex-col gap-3">
        <h1 className="text-[32px] font-extrabold leading-9 tracking-[-0.02em]">
          {MARKETING_LABELS.title}
        </h1>
        <p className="text-[16px] leading-6 text-[var(--text-secondary)]">{MARKETING_LABELS.lead}</p>
        <p className="text-[15px] leading-6 text-[var(--text-secondary)] opacity-80">
          {MARKETING_LABELS.contactHint}
        </p>
      </div>
      <p className="text-[13px] opacity-50">
        <a className="underline underline-offset-2" href={MARKETING_LABELS.staffHref}>
          {MARKETING_LABELS.staffLinkLabel}
        </a>
      </p>
    </main>
  );
}
