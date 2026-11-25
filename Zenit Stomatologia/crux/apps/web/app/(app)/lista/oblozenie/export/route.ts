import {
  drilldownCapacity,
  drilldownOccupancy,
  listDashboardChairs,
  listDashboardLocations,
} from "@crux/analytics";
import { authorize } from "@crux/identity";
import { publishEvent } from "@crux/platform";
import { toCsv, type CsvCell } from "@/features/analytics/csv";
import { parseDashboardFilters, type RawSearchParams } from "@/features/analytics/filters";
import { parseMetricId } from "@/features/analytics/drilldown";
import { getDb } from "@/server/db";
import { requireActor } from "@/server/with-actor";
import { systemClock, toLocalDay } from "@crux/shared/time";

/**
 * CSV z listy drążenia (F0-011): `analytics.export`, zapis zdarzenia audytowego w outboxie.
 * Kolumny: dzień, gabinet, fotel, klucz wykonawcy, kategoria, źródło, minuty, godziny, kwota, wpisy
 * (bez nazwisk; klucz wykonawcy to identyfikator).
 */
export async function GET(request: Request): Promise<Response> {
  const actor = await requireActor();
  const params: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((v, k) => {
    params[k] = v;
  });
  const raw: RawSearchParams = params;
  const metric = parseMetricId(params["metric"]);
  if (!metric) return new Response("Nieznana metryka.", { status: 400 });

  const db = getDb();
  const outcome = await db.withActor(actor, async (tx) => {
    const allowed = await authorize(tx, actor, "analytics.export");
    if (!allowed.ok) return { status: 403 as const };

    const locations = await listDashboardLocations(tx, actor);
    const parsed = parseDashboardFilters(raw, actor, locations, {
      today: toLocalDay(systemClock.now()),
      mode: actor.permissions.some((p) => p === "analytics.view_network" || p === "analytics.view_location")
        ? "network"
        : "self",
    });
    const number = (id: string) => locations.find((l) => l.id === id)?.number ?? "";
    const chairs = new Map((await listDashboardChairs(tx, actor)).map((c) => [c.id, c.name]));
    const tab = params["tab"] === "mianownik" ? "mianownik" : "licznik";

    let csv: string;
    let rowCount: number;
    if (tab === "mianownik") {
      const cap = await drilldownCapacity(tx, actor, parsed.metric);
      if (!cap.ok) return { status: cap.error.type === "forbidden" ? (403 as const) : (500 as const) };
      rowCount = cap.value.rows.length;
      csv = toCsv(
        ["dzien", "gabinet", "fotel", "otwarcie_min", "blokady_min", "dostepne_min"],
        cap.value.rows.map((r): CsvCell[] => [
          r.dateKey, number(r.locationId), chairs.get(r.chairKey) ?? "", r.openMinutes, r.blockedMinutes, r.availableMinutes,
        ]),
      );
    } else {
      const dd = await drilldownOccupancy(tx, actor, parsed.metric);
      if (!dd.ok) return { status: dd.error.type === "forbidden" ? (403 as const) : (500 as const) };
      rowCount = dd.value.rows.length;
      csv = toCsv(
        ["dzien", "gabinet", "fotel", "wykonawca_klucz", "kategoria", "zrodlo", "minuty", "godziny", "kwota_pln", "wpisy"],
        dd.value.rows.map((r): CsvCell[] => [
          r.dateKey, number(r.locationId), chairs.get(r.chairKey) ?? "", r.providerKey, r.categoryKey, r.source,
          r.occupiedMinutes, Math.round((r.occupiedMinutes / 60) * 100) / 100, r.amountGrosze / 100, r.entries,
        ]),
      );
    }

    const loc = parsed.metric.locationIds?.length === 1 ? parsed.metric.locationIds[0] : undefined;
    const audit = await publishEvent(tx, actor, "analytics.export_generated.v1", {
      tenantId: actor.tenantId,
      ...(loc ? { locationId: loc } : {}),
      metric,
      tab,
      from: parsed.period.from,
      to: parsed.period.to,
      rows: rowCount,
    });
    if (!audit.ok) return { status: 500 as const };
    return { status: 200 as const, csv, name: `oblozenie-${metric}-${parsed.period.from}_${parsed.period.to}.csv` };
  });

  if (outcome.status === 403) return new Response("Brak uprawnień do eksportu.", { status: 403 });
  if (outcome.status !== 200) return new Response("Nie udało się wygenerować pliku.", { status: 500 });
  return new Response(outcome.csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${outcome.name}"`,
      "cache-control": "no-store",
    },
  });
}
