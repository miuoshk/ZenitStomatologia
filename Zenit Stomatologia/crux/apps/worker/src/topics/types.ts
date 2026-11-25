import type { CruxDb, Tx } from "@crux/db";
import type { Logger } from "../logger";

export type TopicHandlerContext = {
  readonly db: CruxDb;
  readonly log: Logger;
  readonly enqueueAnalyticsRefresh: (input: {
    tenantId: string;
    locationId: string;
    day: string;
  }) => Promise<void>;
};

export type TopicHandler = (
  ctx: TopicHandlerContext,
  payload: Record<string, unknown>,
  tx: Tx,
) => Promise<void>;
