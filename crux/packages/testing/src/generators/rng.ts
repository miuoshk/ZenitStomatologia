import seedrandom from "seedrandom";

/** Deterministyczny PRNG (seedrandom) — `rng()` zwraca [0,1). */
export type Rng = () => number;

export function createRng(seed: string | number): Rng {
  const prng = seedrandom(String(seed));
  return () => prng();
}

/** Całkowita z przedziału [min, max] włącznie. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new RangeError("pick: pusta lista");
  return item;
}

/** Losowanie wg wag (suma wag dowolna > 0). */
export function pickWeighted<T extends string>(rng: Rng, weights: Readonly<Record<T, number>>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let x = rng() * total;
  for (const [key, w] of entries) {
    x -= w;
    if (x < 0) return key;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new RangeError("pickWeighted: puste wagi");
  return last[0];
}

/** Fisher–Yates na kopii. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}
