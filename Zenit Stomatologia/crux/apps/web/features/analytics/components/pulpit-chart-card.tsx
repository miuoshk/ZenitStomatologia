"use client";

import { ChartCard } from "@crux/ui";
import type { ReactNode } from "react";
import { setWidokParam, type WidokKarty } from "../filters";

type Props = {
  cardId: string;
  title: string;
  hint?: string;
  legend?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  defaultView: WidokKarty;
  refreshedAt?: Date;
  className?: string;
};

/** ChartCard z zapisem widoku „Wykres | Tabela” w URL (`widok=<karta>:tabela`) bez przeładowania kart. */
export function PulpitChartCard({ cardId, defaultView, ...rest }: Props) {
  return (
    <ChartCard
      {...rest}
      defaultView={defaultView}
      onViewChange={(view) => {
        const q = setWidokParam(window.location.search, cardId, view);
        window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
      }}
    />
  );
}
