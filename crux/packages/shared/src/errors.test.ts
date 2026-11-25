import { describe, expect, it } from "vitest";
import { mapPgError } from "./errors";

describe("mapPgError", () => {
  it("23505 → conflict", () => {
    const r = mapPgError({ code: "23505", constraint: "appointments_pkey" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toEqual({
        type: "conflict",
        details: { constraint: "appointments_pkey" },
      });
    }
  });

  it("23P01 → conflict exclusion", () => {
    const r = mapPgError({ code: "23P01" });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.type === "conflict") {
      expect(r.error.details?.constraint).toBe("exclusion");
    }
  });

  it("42501 → forbidden", () => {
    const r = mapPgError({ code: "42501" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.type).toBe("forbidden");
    }
  });

  it("inny kod → technical", () => {
    const r = mapPgError({ code: "57014" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.type).toBe("technical");
    }
  });
});
