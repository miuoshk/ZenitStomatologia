"use server";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { retryDeadOutbox } from "@crux/platform";
import { runAdmin } from "@/features/settings/run";
import type { AdminState } from "@/features/settings/types";

export async function retryOutboxAction(outboxId: string): Promise<AdminState> {
  return runAdmin(
    ["/integracje"],
    (tx, actor) => retryDeadOutbox(tx, actor, outboxId),
    () => ({ message: L.integrations.retried }),
  );
}
