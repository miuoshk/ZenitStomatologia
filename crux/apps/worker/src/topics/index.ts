import { occupancyHandlers } from "./occupancy";
import { platformHandlers } from "./platform";
import type { TopicHandler } from "./types";

export type { TopicHandler, TopicHandlerContext } from "./types";

export const topicHandlers: Record<string, TopicHandler> = {
  ...occupancyHandlers,
  ...platformHandlers,
};
