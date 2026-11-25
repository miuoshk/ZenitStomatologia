import { asString } from "./payload";
import type { TopicHandler } from "./types";

export const platformHandlers: Record<string, TopicHandler> = {
  "platform.test.v1": (ctx, payload) => {
    ctx.log.info({ topic: "platform.test.v1", entity: asString(payload["entityId"]) }, "test event");
    return Promise.resolve();
  },
  "platform.setting_changed.v1": (ctx, payload) => {
    ctx.log.info(
      { topic: "platform.setting_changed.v1", tenant_id: asString(payload["tenantId"]) },
      "setting changed",
    );
    return Promise.resolve();
  },
  "platform.flag_changed.v1": (ctx, payload) => {
    ctx.log.info(
      { topic: "platform.flag_changed.v1", flag: asString(payload["flagKey"]) },
      "flag changed",
    );
    return Promise.resolve();
  },
  "analytics.export_generated.v1": (ctx, payload) => {
    ctx.log.info(
      {
        topic: "analytics.export_generated.v1",
        tenant_id: asString(payload["tenantId"]),
        metric: asString(payload["metric"]),
      },
      "analytics export generated",
    );
    return Promise.resolve();
  },
  "platform.outbox.dead.v1": (ctx, payload) => {
    ctx.log.warn(
      {
        topic: "platform.outbox.dead.v1",
        outbox_id: asString(payload["outboxId"]),
        tenant_id: asString(payload["tenantId"]),
      },
      "outbox dead letter observed",
    );
    return Promise.resolve();
  },
};
