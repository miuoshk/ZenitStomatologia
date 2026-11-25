import { randomBytes } from "node:crypto";
import { LocalKeyProvider, type KeyProvider } from "@crux/shared/crypto";

/** In-memory KeyProvider z losowym DEK/pepperem na instancję (tylko testy). */
export function createFakeKeyProvider(keyId = "local-v1"): KeyProvider {
  return new LocalKeyProvider({
    KMS_LOCAL_DEK: randomBytes(32).toString("hex"),
    KMS_LOCAL_PEPPER: randomBytes(32).toString("hex"),
    KMS_KEY_ID: keyId,
  });
}
