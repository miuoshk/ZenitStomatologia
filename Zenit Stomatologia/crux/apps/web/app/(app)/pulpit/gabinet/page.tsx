import { Forbidden, NetworkOrLocationDashboard } from "@/features/analytics/components/pulpit-views";
import { loadDashboardContext } from "@/features/analytics/context";
import type { RawSearchParams } from "@/features/analytics/filters";

type Props = { searchParams: Promise<RawSearchParams> };

/** Pulpit gabinetu 1.0: `analytics.view_location`; gabinet zawsze z członkostwa aktora. */
export default async function PulpitGabinetPage({ searchParams }: Props) {
  const ctx = await loadDashboardContext("location", "/pulpit/gabinet", await searchParams);
  if (!ctx) return <Forbidden />;
  return <NetworkOrLocationDashboard ctx={ctx} />;
}
