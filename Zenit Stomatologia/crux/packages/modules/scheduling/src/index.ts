export {
  OCCUPANCY_CATEGORIES,
  OCCUPANCY_MESSAGES_PL,
  NOTE_MAX_LENGTH,
  DayClosure,
  OccupancyEntry,
  isDayClosed,
  isHourWithinWindow,
  occupancyMessagePl,
  validateNote,
  type DaySummary,
  type OccupancyCategory,
  type OccupancyContext,
  type OccupancyEntryData,
  type OccupancyEntryInput,
  type OccupancyErrorCode,
  type OccupancySource,
} from "./domain/chair-occupancy";

export {
  recordOccupancy,
  recordOccupancyRange,
  type RecordOccupancyInput,
  type RecordOccupancyRangeInput,
} from "./application/record-occupancy";
export { voidOccupancy, type VoidOccupancyInput } from "./application/void-occupancy";
export { copyDayFrom, type CopyDayFromInput } from "./application/copy-day";
export {
  closeDay,
  reopenDay,
  type CloseDayInput,
  type ReopenDayInput,
} from "./application/day-closure";
export {
  createTimeBlock,
  endTimeBlock,
  type CreateTimeBlockInput,
  type EndTimeBlockInput,
} from "./application/time-blocks";
export {
  getDayGrid,
  getWeekSummary,
  listOccupancy,
  type DayGridBlock,
  type DayGridChair,
  type DayGridEntry,
  type DayGridLocation,
  type GetDayGridInput,
  type GetWeekSummaryInput,
  type ListOccupancyInput,
  type OccupancyListItem,
  type WeekDaySummary,
} from "./application/queries";

export { OCCUPANCY_PERMISSIONS, type OccupancyPermission } from "./permissions";
export {
  OCCUPANCY_EVENT_TOPICS,
  type OccupancyDayClosedPayload,
  type OccupancyDayReopenedPayload,
  type OccupancyEntryRecordedPayload,
  type OccupancyEntryVoidedPayload,
  type OccupancyEventTopic,
} from "./events";
