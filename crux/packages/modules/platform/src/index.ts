export type { DomainEvent } from "./domain/events";

export {
  eventRegistry,
  getEventSchema,
  FORBIDDEN_EVENT_FIELD_NAMES,
  type EventTopic,
  type EventPayload,
} from "./events/registry";

export { settingKeys, getSettingDef, type SettingKey } from "./settings/keys";

export { publishEvent, type PublishEventOpts } from "./application/publish-event";
export { findCommand, recordCommand } from "./application/command-log";
export { logAccess, type LogAccessInput } from "./application/log-access";
export { isEnabled, type FlagScope } from "./application/feature-flags";
export { getSetting, setSetting } from "./application/settings";
export { retryDeadOutbox } from "./application/outbox-admin";
export { setFeatureFlag } from "./application/feature-flags-admin";
