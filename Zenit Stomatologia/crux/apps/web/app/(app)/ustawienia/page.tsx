import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { Card } from "@crux/ui";
import Link from "next/link";
import { requireActor } from "@/server/with-actor";

const SECTIONS = [
  { href: "/ustawienia/organizacja", permission: "org.manage", ...L.hub.organizacja },
  { href: "/ustawienia/personel", permission: "staff.manage", ...L.hub.personel },
  { href: "/ustawienia/system", permission: "settings.manage", ...L.hub.system },
  { href: "/integracje", permission: "integrations.manage", ...L.hub.integracje },
  { href: "/ustawienia/profil", permission: null, ...L.hub.profil },
  { href: "/ustawienia/o-crux", permission: null, ...L.hub.oCrux },
] as const;

export default async function UstawieniaPage() {
  const actor = await requireActor();
  const visible = SECTIONS.filter((s) => s.permission === null || actor.permissions.includes(s.permission));
  return (
    <div>
      <h1 className="text-2xl font-medium text-[var(--text-primary)]">{L.title}</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {visible.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block">
              <Card className="h-full transition-colors hover:bg-[var(--surface-sunken)]">
                <p className="font-bold text-[var(--zenit-zielen)]">{s.title}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{s.hint}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
