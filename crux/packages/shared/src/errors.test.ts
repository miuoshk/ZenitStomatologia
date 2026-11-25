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
  it("błąd opakowany przez Drizzle (cause) mapuje się po SQLSTATE przyczyny", () => {
    const wrapped = { message: "Failed query: update …", cause: { code: "23P01", constraint: "chair_occupancy_excl" } };
    const r = mapPgError(wrapped);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ type: "conflict", details: { constraint: "chair_occupancy_excl" } });
  });

  it("42501 day_closed ze strażnika bazy → forbidden z powodem day_closed", () => {
    const r = mapPgError({ message: "Failed query", cause: { code: "42501", message: "day_closed" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ type: "forbidden", details: { reason: "day_closed" } });
  });
});
