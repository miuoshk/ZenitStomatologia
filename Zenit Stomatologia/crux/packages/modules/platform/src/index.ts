export type { DomainEvent } from "./domain/events.js";

export {
  eventRegistry,
  getEventSchema,
  FORBIDDEN_EVENT_FIELD_NAMES,
  type EventTopic,
  type EventPayload,
} from "./events/registry.js";

export { settingKeys, getSettingDef, type SettingKey } from "./settings/keys.js";

export { publishEvent, type PublishEventOpts } from "./application/publish-event.js";
export { findCommand, recordCommand } from "./application/command-log.js";
export { logAccess, type LogAccessInput } from "./application/log-access.js";
export { isEnabled, type FlagScope } from "./application/feature-flags.js";
export { getSetting, setSetting } from "./application/settings.js";
