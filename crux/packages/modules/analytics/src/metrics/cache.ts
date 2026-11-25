import type { Clock } from "@crux/shared/time";
import type { MetricResult } from "./types";

const TTL_MS = 60_000;

type Entry = { readonly expiresAt: number; readonly value: MetricResult };

const store = new Map<string, Entry>();

/** Deterministyczna serializacja (klucze posortowane) do kluczy cache. */
export function stableSerialize(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(",")}}`;
}

export function cacheGet(key: string, clock: Clock): MetricResult | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= clock.now().getTime()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function cacheSet(key: string, value: MetricResult, clock: Clock): void {
  store.set(key, { expiresAt: clock.now().getTime() + TTL_MS, value });
}

/** Test / unieważnienie po odświeżeniu analityki. */
export function clearMetricCache(): void {
  store.clear();
}
