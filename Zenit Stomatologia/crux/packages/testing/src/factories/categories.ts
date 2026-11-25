/** Kategorie obłożenia i zakresy kwot (grosze) — dane syntetyczne do demo/golden. */
export const CATEGORY_KEYS = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_WEIGHTS: Readonly<Record<CategoryKey, number>> = {
  Z1: 0.2,
  Z2: 0.25,
  Z3: 0.28,
  Z4: 0.15,
  Z5: 0.08,
  "Z+": 0.04,
};

/** [min, max] w groszach, krok 100 gr (pełne złote). */
export const CATEGORY_AMOUNT_RANGES: Readonly<Record<CategoryKey, readonly [number, number]>> = {
  Z1: [8_000, 15_000],
  Z2: [15_000, 30_000],
  Z3: [30_000, 60_000],
  Z4: [60_000, 120_000],
  Z5: [120_000, 250_000],
  "Z+": [250_000, 600_000],
};
