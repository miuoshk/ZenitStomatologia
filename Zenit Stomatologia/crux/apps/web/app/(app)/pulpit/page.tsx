import { Forbidden, NetworkOrLocationDashboard } from "@/features/analytics/components/pulpit-views";
import { loadDashboardContext } from "@/features/analytics/context";
import type { RawSearchParams } from "@/features/analytics/filters";

type Props = { searchParams: Promise<RawSearchParams> };

/** Pulpit sieci 1.0 (F0-011): `analytics.view_network`; pozostałe role są przekierowywane. */
export default async function PulpitPage({ searchParams }: Props) {
  const ctx = await loadDashboardContext("network", "/pulpit", await searchParams);
  if (!ctx) return <Forbidden />;
  return <NetworkOrLocationDashboard ctx={ctx} />;
}
