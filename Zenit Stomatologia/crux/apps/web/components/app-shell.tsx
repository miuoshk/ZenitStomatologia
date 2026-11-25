"use client";

import {
  AppShell as UiAppShell,
  CommandPalette,
  CruxLogo,
  LocationSwitcher,
  type Command,
} from "@crux/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

const NAV = [
  { id: "oblozenie", label: "Obłożenie", href: "/oblozenie" },
  { id: "pulpit", label: "Pulpit", href: "/pulpit" },
  { id: "ustawienia", label: "Ustawienia", href: "/ustawienia" },
] as const;

export function AppShell({
  children,
  locations,
  activeLocationId,
  staffLabel,
  canNetworkView,
  idleLockMs,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
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

  const activeId =
    NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.id ?? "oblozenie";

  const locationItems = useMemo(
    () => locations.map((loc) => ({ id: loc.id, code: loc.number, name: loc.name })),
    [locations],
  );

  const commands: Command[] = useMemo(() => {
    const navCmds: Command[] = NAV.map((n) => ({
      id: n.id,
      label: n.label,
      run: () => {
        router.push(n.href);
      },
    }));
    const locCmds: Command[] = locations.map((loc) => ({
      id: `loc-${loc.id}`,
      label: `Gabinet ${loc.number} ${loc.name}`,
      run: () => {
        void switchLocation(loc.id);
      },
    }));
    return [...navCmds, ...locCmds];
  }, [locations, router]);

  return (
    <>
      <UiAppShell
        nav={[...NAV]}
        activeId={activeId}
        collapsed={collapsed}
        brand={
          <div className="flex w-full items-center gap-2">
            {collapsed ? (
              <img src="/brand/logo/crux-znak-krem.svg" alt="Crux" width={28} height={28} />
            ) : (
              <img src="/brand/logo/crux-poziomy-krem.svg" alt="Crux" height={28} className="h-7" />
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
        }
        sidebarTop={
          !collapsed ? (
            <div className="mb-2 px-1">
              <LocationSwitcher
                locations={locationItems}
                value={activeLocationId}
                onChange={(id) => {
                  if (id) void switchLocation(id);
                }}
                allLabel={canNetworkView ? "cała sieć" : null}
                className="flex-col items-stretch"
              />
            </div>
          ) : null
        }
        sidebarBottom={
          <div className="mt-auto border-t border-white/10 p-2 text-xs">
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
        }
        header={
          <>
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
          </>
        }
      >
        {children}
      </UiAppShell>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
    </>
  );
}
