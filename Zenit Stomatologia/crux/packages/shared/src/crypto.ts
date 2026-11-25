/**
 * Szyfrowanie kopertowe (ADR-025). Tylko `node:crypto`.
 * LocalKeyProvider — wyłącznie środowisko lokalne / testy (NIE produkcja).
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

export type KeyProvider = {
  getDek(tenantId: string, keyId: string): Promise<Buffer>;
  currentKeyId(tenantId: string): Promise<string>;
  getPepper(tenantId: string): Promise<Buffer>;
};

const ENC_PREFIX = "enc:v1:";

/**
 * NIE-produkcyjne. Klucze z env (`.env.example`):
 * - `KMS_LOCAL_DEK` — 64 znaki hex (32 bajty) lub base64 32 bajtów
 * - `KMS_KEY_ID` — domyślnie `local-v1`
 * - `KMS_LOCAL_PEPPER` — hex/base64 jak DEK
 */
export class LocalKeyProvider implements KeyProvider {
  readonly #dek: Buffer;
  readonly #keyId: string;
  readonly #pepper: Buffer;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const dekRaw = env["KMS_LOCAL_DEK"];
    const pepperRaw = env["KMS_LOCAL_PEPPER"];
    if (!dekRaw || !pepperRaw) {
      throw new Error(
        "LocalKeyProvider: ustaw KMS_LOCAL_DEK i KMS_LOCAL_PEPPER (tylko lokalnie, NIE produkcja)",
      );
    }
    this.#dek = parseKeyMaterial(dekRaw, "KMS_LOCAL_DEK");
    this.#pepper = parseKeyMaterial(pepperRaw, "KMS_LOCAL_PEPPER");
    this.#keyId = env["KMS_KEY_ID"] || "local-v1";
  }

  getDek(_tenantId: string, keyId: string): Promise<Buffer> {
    if (keyId !== this.#keyId) {
      return Promise.reject(new Error(`LocalKeyProvider: nieznany keyId '${keyId}'`));
    }
    return Promise.resolve(Buffer.from(this.#dek));
  }

  currentKeyId(_tenantId: string): Promise<string> {
    return Promise.resolve(this.#keyId);
  }

  getPepper(_tenantId: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from(this.#pepper));
  }
}

function parseKeyMaterial(raw: string, label: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const b64 = Buffer.from(trimmed, "base64");
  if (b64.length === 32) return b64;
  throw new Error(`${label}: oczekiwano 32 bajtów (64 hex lub base64)`);
}

/** AES-256-GCM → `enc:v1:<keyId>:<ivB64>:<ctB64>` (ct = ciphertext ‖ tag). */
export async function encryptField(
  plaintext: string,
  tenantId: string,
  keys: KeyProvider,
): Promise<string> {
  const keyId = await keys.currentKeyId(tenantId);
  const dek = await keys.getDek(tenantId, keyId);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([ct, tag]);
  return `${ENC_PREFIX}${keyId}:${iv.toString("base64")}:${payload.toString("base64")}`;
}

export async function decryptField(
  encoded: string,
  tenantId: string,
  keys: KeyProvider,
): Promise<string> {
  if (!encoded.startsWith(ENC_PREFIX)) {
    throw new Error("decryptField: nieznany format (oczekiwano enc:v1:…)");
  }
  const rest = encoded.slice(ENC_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) {
    throw new Error("decryptField: uszkodzony literał enc:v1");
  }
  const [keyId, ivB64, ctB64] = parts;
  if (!keyId || !ivB64 || !ctB64) {
    throw new Error("decryptField: uszkodzony literał enc:v1");
  }
  const dek = await keys.getDek(tenantId, keyId);
  const iv = Buffer.from(ivB64, "base64");
  const payload = Buffer.from(ctB64, "base64");
  if (payload.length < 16) {
    throw new Error("decryptField: zbyt krótki ciphertext");
  }
  const tag = payload.subarray(payload.length - 16);
  const ct = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/** HMAC-SHA256 (hex) do wyszukiwania po PESEL — `pesel_hmac`. */
export async function hmacField(
  value: string,
  tenantId: string,
  keys: KeyProvider,
): Promise<string> {
  const pepper = await keys.getPepper(tenantId);
  return createHmac("sha256", pepper).update(value, "utf8").digest("hex");
}
