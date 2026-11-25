import { stableUuid } from "../generators/ids";

export const GOLDEN_SEED = 20261105;
/** Ostatni dzień okresu (stały — determinizm, bez „dzisiaj”). */
export const GOLDEN_END = "2026-10-31";
/** 13 miesięcy kalendarzowych: 2025-10 … 2026-10. */
export const GOLDEN_START = "2025-10-01";
export const GOLDEN_OPENING_VALID_FROM = "2025-01-01";

export const GOLDEN_TENANT_NAME = "Zenit Stomatologia DEMO";
export const GOLDEN_TENANT_ID = stableUuid("golden:tenant");
export const GOLDEN_OPERATOR_ID = stableUuid("golden:operator");

/** Docelowe wypełnienie godzin otwarcia (dni robocze) i mnożnik soboty. */
export const FILL_TARGET: Readonly<Record<"01" | "02", number>> = { "01": 0.8, "02": 0.65 };
export const SATURDAY_FILL_FACTOR = 0.7;
export const DAY_CLOSURE_RATE = 0.95;
export const GOLDEN_TIME_BLOCK_COUNT = 6;
