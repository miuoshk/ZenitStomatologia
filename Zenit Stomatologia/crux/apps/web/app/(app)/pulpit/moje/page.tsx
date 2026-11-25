import { MineDashboard, Forbidden } from "@/features/analytics/components/pulpit-views";
import { loadDashboardContext } from "@/features/analytics/context";
import type { RawSearchParams } from "@/features/analytics/filters";

type Props = { searchParams: Promise<RawSearchParams> };

/** Pulpit „moje” 1.0: `analytics.view_self`; wykonawca = ja wymuszany po stronie serwera. */
export default async function PulpitMojePage({ searchParams }: Props) {
  const ctx = await loadDashboardContext("self", "/pulpit/moje", await searchParams);
  if (!ctx) return <Forbidden />;
  return <MineDashboard ctx={ctx} />;
}
