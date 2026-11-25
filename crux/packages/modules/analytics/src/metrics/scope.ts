import type { Actor } from "@crux/db";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { plainDate } from "@crux/shared/time";
import type { ClampedFilters, MetricFilters, MetricPermission, MetricScope } from "./types";

const CATEGORY_RE = /^Z(?:[1-5]|\+)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIER: Record<MetricPermission, number> = {
  "analytics.view_self": 0,
  "analytics.view_location": 1,
  "analytics.view_network": 2,
};
const SCOPE_BY_TIER: readonly MetricScope[] = ["self", "location", "network"];

/** Najwyższy zakres wynikający z uprawnień aktora (null = brak uprawnień analytics). */
export function actorScope(actor: Actor): MetricScope | null {
  let best = -1;
  for (const [perm, tier] of Object.entries(TIER)) {
    if (actor.permissions.includes(perm) && tier > best) best = tier;
  }
  return best < 0 ? null : (SCOPE_BY_TIER[best] ?? null);
}

/** Czy aktor spełnia wymagane uprawnienie metryki (wyższy zakres obejmuje niższy). */
export function satisfies(scope: MetricScope | null, required: MetricPermission): boolean {
  if (scope === null) return false;
  return SCOPE_BY_TIER.indexOf(scope) >= TIER[required];
}

function validation(field: string, code: string): DomainError {
  return { type: "validation", details: { field, code } };
}

/**
 * Przycięcie filtrów po stronie serwera (docs/11 §3): parametry spoza uprawnień są ignorowane.
 *  - self: wykonawca = aktor; gabinety ∩ członkostwa
 *  - location: gabinety ∩ członkostwa (brak = wszystkie członkostwa)
 *  - network: bez ograniczeń (RLS i tak filtruje po tenancie)
 */
export function clampFilters(
  actor: Actor,
  scope: MetricScope,
  filters: MetricFilters,
): Result<ClampedFilters, DomainError> {
  let from: string;
  let to: string;
  try {
    from = plainDate(filters.from);
    to = plainDate(filters.to);
  } catch {
    return err(validation("okres", "invalid_date"));
  }
  if (from > to) return err(validation("okres", "from_after_to"));

  const requestedLocations = (filters.locationIds ?? []).filter((id) => UUID_RE.test(id));
  let locationIds: string[];
  if (scope === "network") {
    locationIds = [...new Set(requestedLocations)];
  } else {
    const allowed = new Set(actor.locationIds);
    const inScope = [...new Set(requestedLocations.filter((id) => allowed.has(id)))];
    locationIds = inScope.length > 0 ? inScope : [...actor.locationIds];
  }

  const providerIds =
    scope === "self"
      ? [actor.staffId]
      : [...new Set((filters.providerIds ?? []).filter((id) => UUID_RE.test(id)))];

  const categories = [...new Set((filters.categories ?? []).filter((c) => CATEGORY_RE.test(c)))];

  return ok({
    from,
    to,
    locationIds: locationIds.sort(),
    providerIds: providerIds.sort(),
    categories: categories.sort(),
  });
}
