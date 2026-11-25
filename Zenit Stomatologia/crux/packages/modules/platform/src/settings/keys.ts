import { z } from "zod";

/**
 * Rejestr kluczy ustawień — walidacja wartości w `setSetting`.
 * Scope: tenant | location.
 */
export const settingKeys = {
  "scheduling.occupancy_mode": {
    scope: "location" as const,
    schema: z.enum(["manual", "appointments"]),
    defaultValue: "manual" as const,
  },
  "ui.default_location": {
    scope: "tenant" as const,
    schema: z.uuid(),
    defaultValue: null as string | null,
  },
  "analytics.targets.chair_utilization": {
    scope: "location" as const,
    schema: z.number().min(0).max(100),
    defaultValue: 80 as number,
  },
} as const;

export type SettingKey = keyof typeof settingKeys;

export function getSettingDef(key: string): (typeof settingKeys)[SettingKey] | null {
  if (!(key in settingKeys)) return null;
  return settingKeys[key as SettingKey];
}
