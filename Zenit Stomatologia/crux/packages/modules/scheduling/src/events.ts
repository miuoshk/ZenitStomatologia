import type { EventPayload } from "@crux/platform";

/** Zdarzenia publikowane przez obłożenie (rejestr: `@crux/platform`). Payload: wyłącznie identyfikatory. */
export const OCCUPANCY_EVENT_TOPICS = [
  "occupancy.entry_recorded.v1",
  "occupancy.entry_voided.v1",
  "occupancy.day_closed.v1",
  "occupancy.day_reopened.v1",
] as const;

export type OccupancyEventTopic = (typeof OCCUPANCY_EVENT_TOPICS)[number];
export type OccupancyEntryRecordedPayload = EventPayload<"occupancy.entry_recorded.v1">;
export type OccupancyEntryVoidedPayload = EventPayload<"occupancy.entry_voided.v1">;
export type OccupancyDayClosedPayload = EventPayload<"occupancy.day_closed.v1">;
export type OccupancyDayReopenedPayload = EventPayload<"occupancy.day_reopened.v1">;
