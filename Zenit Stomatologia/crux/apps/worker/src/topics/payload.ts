/** Bezpieczne wyciągnięcie stringa z payloadu (bez `[object Object]`). */
export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
