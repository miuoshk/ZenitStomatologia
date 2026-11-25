/** TODO(K08): przenieść AppShell / LocationSwitcher do @crux/ui. */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CruxLogo } from "@/lib/crux-logo";

export type ShellLocation = {
  id: string;
  number: string;
  name: string;
};

type Props = {
  children: ReactNode;
  locations: ShellLocation[];
  activeLocationId: string;
  staffLabel: string;
  canNetworkView: boolean;
  idleLockMs: number;
};

const NAV: { href: string; label: string }[] = [
  { href: "/oblozenie", label: "Obłożenie" },
  { href: "/pulpit", label: "Pulpit" },
  { href: "/ustawienia", label: "Ustawienia" },
];

export function AppShell({
  children,
  locations,
  activeLocationId,
  staffLabel,
  canNetworkView,
  idleLockMs,
}: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const bump = () => {
      clearTimeout(timer);
      document.cookie = `crux.last_activity=${String(Date.now())}; path=/; SameSite=Lax`;
      timer = setTimeout(() => {
        document.cookie = "crux.lock=1; path=/; SameSite=Lax";
        router.push("/zablokowany");
        router.refresh();
      }, idleLockMs);
    };
    bump();
    const events = ["pointerdown", "keydown", "mousemove"] as const;
    for (const e of events) window.addEventListener(e, bump);
    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, bump);
    };
  }, [idleLockMs, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function switchLocation(id: string) {
    await fetch("/api/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locationId: id }),
    });
    router.refresh();
  }

  function lockNow() {
    document.cookie = "crux.lock=1; path=/; SameSite=Lax";
    router.push("/zablokowany");
    router.refresh();
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/logowanie");
    router.refresh();
  }

  const width = collapsed ? 64 : 232;

  return (
    <div className="flex min-h-dvh bg-[var(--surface-app)] text-[var(--text-primary)]">
      <aside
        className="flex shrink-0 flex-col bg-[var(--zenit-butelka)] text-[var(--zenit-krem)]"
        style={{ width }}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          {collapsed ? (
            <img src="/brand/logo/crux-znak-krem.svg" alt="Crux" width={28} height={28} />
          ) : (
            <img src="/brand/logo/crux-poziomy-krem.svg" alt="Crux" height={28} />
          )}
          <button
            type="button"
            className="ml-auto rounded-[var(--radius-pole)] px-2 py-1 text-sm hover:bg-white/10"
            onClick={() => {
              setCollapsed((c) => !c);
            }}
            aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 pb-3">
            <label className="sr-only" htmlFor="location-switcher">
              Gabinet
            </label>
            <select
              id="location-switcher"
              className="w-full rounded-[var(--radius-input)] border-0 bg-[var(--zenit-zielen)] px-3 py-2 text-sm text-[var(--zenit-krem)]"
              value={activeLocationId}
              onChange={(e) => {
                void switchLocation(e.target.value);
              }}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.number} {loc.name}
                </option>
              ))}
              {canNetworkView && (
                <option value="network" disabled>
                  cała sieć
                </option>
              )}
            </select>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-pole)] px-3 py-2 text-sm hover:bg-white/10"
            >
              {collapsed ? item.label.slice(0, 1) : item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 text-xs">
          {!collapsed && <p className="mb-2 truncate opacity-80">{staffLabel}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-[var(--radius-pelne)] bg-[var(--zenit-zielen)] px-3 py-1"
              onClick={lockNow}
            >
              Blokada
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-pelne)] px-3 py-1 hover:bg-white/10"
              onClick={() => {
                void signOut();
              }}
            >
              Wyloguj
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-card)] px-4">
          <button
            type="button"
            className="rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => {
              setPaletteOpen(true);
            }}
          >
            Szukaj… ⌘K
          </button>
          <CruxLogo size={20} className="ml-auto text-[var(--zenit-butelka)]" />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>

      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]"
          role="dialog"
          aria-label="Paleta poleceń"
          onClick={() => {
            setPaletteOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-[var(--radius-karta)] bg-[var(--surface-card)] p-4 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Przejdź do</p>
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-[var(--radius-pole)] px-3 py-2 hover:bg-[var(--surface-sunken)]"
                    onClick={() => {
                      setPaletteOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    className="w-full rounded-[var(--radius-pole)] px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                    onClick={() => {
                      void switchLocation(loc.id);
                      setPaletteOpen(false);
                    }}
                  >
                    Gabinet {loc.number} {loc.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
