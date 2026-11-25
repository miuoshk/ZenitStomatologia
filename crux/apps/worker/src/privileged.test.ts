import { describe, expect, it } from "vitest";
import { isPrivilegedOperation } from "@crux/db";
import { WORKER_OPERATIONS } from "./privileged";

describe("privileged allowlist", () => {
  it("każda operacja z WORKER_OPERATIONS jest na allowliście db", () => {
    for (const name of Object.keys(WORKER_OPERATIONS)) {
      expect(isPrivilegedOperation(name)).toBe(true);
    }
  });

  it("nieznana operacja jest odrzucana", () => {
    expect(isPrivilegedOperation("nieznana")).toBe(false);
  });
});
