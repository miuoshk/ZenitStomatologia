import { createHash } from "node:crypto";

/** Przestrzeń nazw golden datasetu (losowa, stała). */
const NAMESPACE = "6f1c2b7e-3d54-4a8b-9c10-5e7a2d4f8b13";

/**
 * Stabilny UUID (v5-podobny, SHA-1) z etykiety — te same ID między uruchomieniami.
 * Używany dla struktury golden (tenant, gabinety, fotele, personel).
 */
export function stableUuid(label: string): string {
  const hash = createHash("sha1")
    .update(Buffer.from(NAMESPACE.replace(/-/g, ""), "hex"))
    .update(label)
    .digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x50;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
