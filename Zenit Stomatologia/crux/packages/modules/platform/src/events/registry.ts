import { z } from "zod";

const IdOnly = z.uuid();

/**
 * Rejestr zdarzeń outboxa — payload wyłącznie identyfikatory (ADR outbox).
 * Zakazane nazwy pól: name, phone, pesel, email, content (test w registry.test).
 */
export const eventRegistry = {
  "platform.setting_changed.v1": z.object({
    tenantId: IdOnly,
    locationId: IdOnly.optional(),
    settingKey: z.string().min(1),
  }),
  "platform.flag_changed.v1": z.object({
    tenantId: IdOnly.optional(),
    locationId: IdOnly.optional(),
    flagKey: z.string().min(1),
    enabled: z.boolean(),
  }),
  "platform.test.v1": z.object({
    entityId: IdOnly,
  }),
} as const;

export type EventTopic = keyof typeof eventRegistry;

export type EventPayload<T extends EventTopic> = z.infer<(typeof eventRegistry)[T]>;

export function getEventSchema(topic: string): z.ZodType<Record<string, unknown>> | null {
  if (!(topic in eventRegistry)) return null;
  return eventRegistry[topic as EventTopic];
}

/** Pola zabronione w payloadach (PII / treść). */
export const FORBIDDEN_EVENT_FIELD_NAMES = [
  "name",
  "phone",
  "pesel",
  "email",
  "content",
] as const;
