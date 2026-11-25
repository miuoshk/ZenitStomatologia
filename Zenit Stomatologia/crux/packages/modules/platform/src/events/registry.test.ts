import { describe, expect, it } from "vitest";
import { eventRegistry, FORBIDDEN_EVENT_FIELD_NAMES, getEventSchema } from "./registry.js";

describe("eventRegistry", () => {
  it("nie ma pól PII w schematach zdarzeń", () => {
    for (const [topic, schema] of Object.entries(eventRegistry)) {
      const shape = schema.shape as Record<string, unknown>;
      for (const forbidden of FORBIDDEN_EVENT_FIELD_NAMES) {
        expect(shape, `${topic} has ${forbidden}`).not.toHaveProperty(forbidden);
      }
    }
  });

  it("getEventSchema zwraca null dla nieznanego tematu", () => {
    expect(getEventSchema("nope.v1")).toBeNull();
    expect(getEventSchema("platform.test.v1")).not.toBeNull();
  });
});
