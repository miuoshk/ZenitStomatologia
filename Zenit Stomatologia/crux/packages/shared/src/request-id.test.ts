import { describe, expect, it } from "vitest";
import { resolveRequestId } from "./request-id";

describe("resolveRequestId", () => {
  it("zachowuje bezpieczny identyfikator", () => {
    expect(resolveRequestId("abc-123_X.y")).toBe("abc-123_X.y");
  });
  it("generuje UUID dla pustego lub niebezpiecznego (np. e-mail)", () => {
    const uuid = /^[0-9a-f-]{36}$/;
    expect(resolveRequestId(null)).toMatch(uuid);
    expect(resolveRequestId("jan@example.com")).toMatch(uuid);
    expect(resolveRequestId("x".repeat(200))).toMatch(uuid);
  });
});
