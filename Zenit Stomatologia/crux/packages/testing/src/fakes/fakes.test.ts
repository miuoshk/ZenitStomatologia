import { describe, expect, it } from "vitest";
import { decryptField, encryptField } from "@crux/shared/crypto";
import { createFakeAuthAdmin } from "./auth-admin";
import { createFakeFileStorage } from "./file-storage";
import { createFakeKeyProvider } from "./key-provider";
import { createFakeSms } from "./sms";

describe("fakes", () => {
  it("[K12] sms zapamiętuje wiadomości", async () => {
    const sms = createFakeSms();
    await sms.send("+48000000000", "x");
    expect(sms.sent).toHaveLength(1);
  });

  it("[K12] auth admin zwraca deterministyczne id", async () => {
    const a = await createFakeAuthAdmin().createUser({ email: "a@demo.invalid", password: "x" });
    const b = await createFakeAuthAdmin().createUser({ email: "A@demo.invalid", password: "y" });
    expect(a.authUserId).toBe(b.authUserId);
  });

  it("[K12] file storage zapisuje do katalogu tymczasowego", async () => {
    const s = await createFakeFileStorage();
    await s.putObject({ key: "a/b.txt", body: Buffer.from("hi") });
    expect((await s.read("a/b.txt")).toString()).toBe("hi");
    await s.cleanup();
  });

  it("[K12] key provider szyfruje i deszyfruje", async () => {
    const keys = createFakeKeyProvider();
    const enc = await encryptField("tajne", "t1", keys);
    expect(await decryptField(enc, "t1", keys)).toBe("tajne");
  });
});
