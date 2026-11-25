"use server";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { setFeatureFlag, setSetting } from "@crux/platform";
import { fail, runAdmin } from "@/features/settings/run";
import type { AdminState } from "@/features/settings/types";
import { formString } from "@/server/form";

const PATH = "/ustawienia/system";

export async function setFlagAction(fd: FormData): Promise<AdminState> {
  const locationId = formString(fd, "locationId");
  const description = formString(fd, "description").trim();
  return runAdmin(
    [PATH],
    (tx, actor) =>
      setFeatureFlag(tx, actor, {
        key: formString(fd, "key").trim(),
        enabled: formString(fd, "enabled") === "on",
        ...(locationId ? { locationId } : {}),
        ...(description ? { description } : {}),
      }),
    () => ({ message: L.saved }),
  );
}

export async function toggleFlagAction(key: string, locationId: string, enabled: boolean): Promise<AdminState> {
  return runAdmin(
    [PATH],
    (tx, actor) => setFeatureFlag(tx, actor, { key, enabled, ...(locationId ? { locationId } : {}) }),
    () => ({ message: L.saved }),
  );
}

export async function saveSettingAction(fd: FormData): Promise<AdminState> {
  const key = formString(fd, "key");
  const locationId = formString(fd, "locationId");
  const raw = formString(fd, "value").trim();
  if (key === "scheduling.occupancy_mode" && raw === "appointments" && formString(fd, "confirmed") !== "on") {
    return fail(L.system.occupancyWarning, "confirmed");
  }
  const value: unknown = key === "scheduling.occupancy_mode" ? raw : raw === "" ? Number.NaN : Number(raw.replace(",", "."));
  return runAdmin(
    [PATH],
    (tx, actor) => setSetting(tx, actor, key, value, locationId),
    () => ({ message: L.system.settingsSaved }),
  );
}
