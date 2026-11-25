export type DashboardPage = "network" | "location" | "self";

export type DashboardAccess =
  | { readonly kind: "ok" }
  | { readonly kind: "redirect"; readonly to: string }
  | { readonly kind: "forbidden" };

export const PULPIT_PATHS: Record<DashboardPage, string> = {
  network: "/pulpit",
  location: "/pulpit/gabinet",
  self: "/pulpit/moje",
};

/**
 * Dostęp do pulpitów wg uprawnień (F0-011/AC3):
 * - `/pulpit` wymaga `view_network`; tylko `view_location` → `/pulpit/gabinet`; tylko `view_self` → `/pulpit/moje`,
 * - `/pulpit/gabinet` wymaga `view_location` (lub sieci); tylko `view_self` → `/pulpit/moje`,
 * - `/pulpit/moje` wymaga `view_self`; wyższe uprawnienie bez `view_self` → właściwy pulpit wyżej.
 */
export function dashboardAccess(
  permissions: readonly string[],
  page: DashboardPage,
): DashboardAccess {
  const has = (p: string) => permissions.includes(p);
  const network = has("analytics.view_network");
  const location = has("analytics.view_location");
  const self = has("analytics.view_self");
  const redirect = (to: string): DashboardAccess => ({ kind: "redirect", to });

  switch (page) {
    case "network":
      if (network) return { kind: "ok" };
      if (location) return redirect(PULPIT_PATHS.location);
      if (self) return redirect(PULPIT_PATHS.self);
      return { kind: "forbidden" };
    case "location":
      if (network || location) return { kind: "ok" };
      if (self) return redirect(PULPIT_PATHS.self);
      return { kind: "forbidden" };
    case "self":
      if (self) return { kind: "ok" };
      if (network) return redirect(PULPIT_PATHS.network);
      if (location) return redirect(PULPIT_PATHS.location);
      return { kind: "forbidden" };
  }
}
