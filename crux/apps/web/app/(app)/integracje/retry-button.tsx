"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { ActionButton } from "@/features/settings/admin-form";
import { retryOutboxAction } from "./actions";

export function RetryButton({ id }: { id: string }) {
  return <ActionButton label={L.integrations.retry} action={() => retryOutboxAction(id)} testId={`retry-${id}`} />;
}
