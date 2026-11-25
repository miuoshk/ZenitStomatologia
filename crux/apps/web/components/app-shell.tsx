"use client";

import {
  AppShell as UiAppShell,
  CommandPalette,
  IconChair,
  IconCollapse,
  IconDashboard,
  IconExpand,
  IconLock,
  IconLogOut,
  IconPlug,
  IconSearch,
  IconSettings,
  ShellSectionLabel,
  cn,
  type Command,
  type NavItem,
} from "@crux/ui";
import { systemClock } from "@crux/shared/time";
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
  staffName: string;
  roleLabel: string;
  canManageIntegrations?: boolean;
  idleLockMs: number;
};

type ShellNav = NavItem & { href: string };

const BASE_NAV: readonly ShellNav[] = [
  { id: "oblozenie", label: "Obłożenie", href: "/oblozenie", icon: <IconChair strokeWidth={1.75} />, section: "Praca" },
  { id: "pulpit", label: "Pulpit", href: "/pulpit", icon: <IconDashboard strokeWidth={1.75} />, section: "Analityka" },
  { id: "integracje", label: "Integracje", href: "/integracje", icon: <IconPlug strokeWidth={1.75} />, section: "System" },
  { id: "ustawienia", label: "Ustawienia", href: "/ustawienia", icon: <IconSettings strokeWidth={1.75} /> },
];

const TODAY = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

export function AppShell({
  children,
  locations,
  activeLocationId,
  staffName,
  roleLabel,
  canManageIntegrations = false,
  idleLockMs,
}: Props) {
  const NAV = useMemo(() => {
    const list = BASE_NAV.filter((n) => n.id !== "integracje" || canManageIntegrations);
    // Bez Integracji sekcja „System” zaczyna się od Ustawień.
    return list.map((n, i) =>
      n.id === "ustawienia" && list[i - 1]?.id !== "integracje" ? { ...n, section: "System" } : n,
    );
  }, [canManageIntegrations]);
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
  }, [locations, router, NAV]);

  const activeLocation = locations.find((l) => l.id === activeLocationId);

  return (
    <>
      <UiAppShell
        nav={NAV}
        activeId={activeId}
        collapsed={collapsed}
        user={{ name: staffName, roleLabel }}
        brand={
          <div className="flex w-full items-center gap-2">
            {collapsed ? (
              <img src="/brand/logo/crux-znak-krem.svg" alt="Crux" width={32} height={32} />
            ) : (
              <img src="/brand/logo/crux-poziomy-krem.svg" alt="Crux" height={32} className="h-8" />
            )}
            <button
              type="button"
              className="ml-auto grid size-8 place-items-center rounded-[var(--radius-pole)] text-[var(--nav-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-fg)]"
              onClick={() => {
                setCollapsed((c) => !c);
              }}
              aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {collapsed ? <IconExpand className="size-4" /> : <IconCollapse className="size-4" />}
            </button>
          </div>
        }
        sidebarTop={
          !collapsed && locations.length > 0 ? (
            <div>
              <ShellSectionLabel>Gabinet</ShellSectionLabel>
              <div role="radiogroup" aria-label="Aktywny gabinet" className="flex flex-col gap-0.5">
                {locations.map((loc) => {
                  const on = loc.id === activeLocationId;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        if (!on) void switchLocation(loc.id);
                      }}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-[var(--radius-input)] px-3 text-left text-[15px] transition-colors",
                        on
                          ? "bg-[var(--nav-chip)] font-semibold text-[var(--nav-fg-strong)]"
                          : "text-[var(--nav-fg)] hover:bg-[var(--nav-hover)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 min-w-8 place-items-center rounded-[var(--radius-pelne)] px-1.5 text-xs font-bold tabular-nums",
                          on
                            ? "bg-[var(--zenit-krem)] text-[var(--zenit-butelka)]"
                            : "border border-[var(--nav-line)] text-[var(--nav-muted)]",
                        )}
                      >
                        {loc.number}
                      </span>
                      <span className="truncate">{loc.name}</span>
                      {on ? (
                        <span aria-hidden className="ml-auto size-2 rounded-full bg-[var(--zenit-bursztyn)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null
        }
        sidebarBottom={
          <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
            <button
              type="button"
              title="Zablokuj ekran"
              className="flex min-h-10 items-center gap-2 rounded-[var(--radius-input)] px-3 text-sm font-medium text-[var(--nav-fg)] hover:bg-[var(--nav-hover)]"
              onClick={lockNow}
            >
              <IconLock className="size-4" strokeWidth={1.75} />
              {collapsed ? <span className="sr-only">Blokada</span> : "Blokada"}
            </button>
            <button
              type="button"
              title="Wyloguj"
              className="flex min-h-10 items-center gap-2 rounded-[var(--radius-input)] px-3 text-sm font-medium text-[var(--nav-fg)] hover:bg-[var(--nav-hover)]"
              onClick={() => {
                void signOut();
              }}
            >
              <IconLogOut className="size-4" strokeWidth={1.75} />
              {collapsed ? <span className="sr-only">Wyloguj</span> : "Wyloguj"}
            </button>
          </div>
        }
        header={
          <>
            <button
              type="button"
              className="flex h-10 w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-pelne)] border border-[var(--border)] bg-[var(--surface-card)] pl-4 pr-2 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)]"
              onClick={() => {
                setPaletteOpen(true);
              }}
            >
              <IconSearch className="size-4" strokeWidth={1.75} />
              <span>Szukaj ekranu lub gabinetu</span>
              <kbd className="ml-auto rounded-[var(--radius-pole)] border border-[var(--border)] px-1.5 py-0.5 font-sans text-[11px] font-semibold">
                ⌘K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="hidden first-letter:uppercase text-[var(--text-secondary)] lg:inline">{TODAY.format(systemClock.now())}</span>
              {activeLocation ? (
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-pelne)] border border-[var(--border)] bg-[var(--surface-card)] py-1 pl-1 pr-3 font-semibold">
                  <span className="grid h-6 min-w-8 place-items-center rounded-[var(--radius-pelne)] bg-[var(--zenit-butelka)] px-1.5 text-xs font-bold text-[var(--zenit-krem)]">
                    {activeLocation.number}
                  </span>
                  {activeLocation.name}
                </span>
              ) : null}
            </div>
          </>
        }
      >
        {children}
      </UiAppShell>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
    </>
  );
}
