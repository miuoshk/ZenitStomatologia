import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptField,
  encryptField,
  hmacField,
  LocalKeyProvider,
} from "./crypto.js";

const TENANT = "11111111-1111-7111-8111-111111111111";

function envWithKeys(): NodeJS.ProcessEnv {
  return {
    KMS_LOCAL_DEK: randomBytes(32).toString("hex"),
    KMS_LOCAL_PEPPER: randomBytes(32).toString("hex"),
    KMS_KEY_ID: "local-v1",
    KMS_PROVIDER: "local",
  };
}

describe("crypto", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("LocalKeyProvider wymaga env (NIE-produkcyjne)", () => {
    expect(() => new LocalKeyProvider({})).toThrow(/KMS_LOCAL_DEK/);
  });

  it("encryptField / decryptField round-trip", async () => {
    const keys = new LocalKeyProvider(envWithKeys());
    const enc = await encryptField("sekret-testowy", TENANT, keys);
    expect(enc.startsWith("enc:v1:local-v1:")).toBe(true);
    const parts = enc.split(":");
    expect(parts).toHaveLength(5); // enc, v1, keyId, iv, ct
    const plain = await decryptField(enc, TENANT, keys);
    expect(plain).toBe("sekret-testowy");
  });

  it("decryptField odrzuca zły tag", async () => {
    const keys = new LocalKeyProvider(envWithKeys());
    const enc = await encryptField("x", TENANT, keys);
    const broken = enc.slice(0, -4) + "AAAA";
    await expect(decryptField(broken, TENANT, keys)).rejects.toThrow();
  });

  it("hmacField jest deterministyczny per pepper", async () => {
    const env = envWithKeys();
    const keys = new LocalKeyProvider(env);
    const a = await hmacField("44051401359", TENANT, keys);
    const b = await hmacField("44051401359", TENANT, keys);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    const other = await hmacField("44051401358", TENANT, keys);
    expect(other).not.toBe(a);
  });

  it("getDek odrzuca obcy keyId", async () => {
    const keys = new LocalKeyProvider(envWithKeys());
    await expect(keys.getDek(TENANT, "other")).rejects.toThrow(/nieznany keyId/);
  });

  it("LocalKeyProvider akceptuje DEK w base64", () => {
    const dek = randomBytes(32);
    const pepper = randomBytes(32);
    const keys = new LocalKeyProvider({
      KMS_LOCAL_DEK: dek.toString("base64"),
      KMS_LOCAL_PEPPER: pepper.toString("base64"),
    });
    expect(keys).toBeInstanceOf(LocalKeyProvider);
  });

  it("LocalKeyProvider odrzuca zły materiał klucza", () => {
    expect(
      () =>
        new LocalKeyProvider({
          KMS_LOCAL_DEK: "za-krotki",
          KMS_LOCAL_PEPPER: randomBytes(32).toString("hex"),
        }),
    ).toThrow(/32 bajtów/);
  });

  it("decryptField — złe formaty", async () => {
    const keys = new LocalKeyProvider(envWithKeys());
    await expect(decryptField("plain", TENANT, keys)).rejects.toThrow(/nieznany format/);
    await expect(decryptField("enc:v1:only-one", TENANT, keys)).rejects.toThrow(/uszkodzony/);
    await expect(decryptField("enc:v1:a:b:", TENANT, keys)).rejects.toThrow(/uszkodzony/);
    const short = `enc:v1:local-v1:${Buffer.from("iv").toString("base64")}:${Buffer.from("x").toString("base64")}`;
    await expect(decryptField(short, TENANT, keys)).rejects.toThrow(/zbyt krótki/);
  });
});
