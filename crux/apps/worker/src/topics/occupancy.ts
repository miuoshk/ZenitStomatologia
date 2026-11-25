import { asString } from "./payload";
import type { TopicHandler } from "./types";

async function occupancyAnalytics(
  ctx: Parameters<TopicHandler>[0],
  payload: Record<string, unknown>,
): Promise<void> {
  const tenantId = asString(payload["tenantId"]);
  const locationId = asString(payload["locationId"]);
  const day = asString(payload["day"]);
  ctx.log.info({ topic: "occupancy", tenantId: tenantId, locationId: locationId }, "occupancy event");
  await ctx.enqueueAnalyticsRefresh({ tenantId, locationId, day });
}

export const occupancyHandlers: Record<string, TopicHandler> = {
  "occupancy.entry_recorded.v1": async (ctx, payload) => occupancyAnalytics(ctx, payload),
  "occupancy.entry_voided.v1": async (ctx, payload) => occupancyAnalytics(ctx, payload),
  "occupancy.day_closed.v1": async (ctx, payload) => occupancyAnalytics(ctx, payload),
  "occupancy.day_reopened.v1": async (ctx, payload) => occupancyAnalytics(ctx, payload),
};
