import { describe, expect, it } from "vitest";
import { asId, IdSchema, newId } from "./id";

describe("Id", () => {
  it("newId zwraca UUIDv7 parse'owalny przez IdSchema", () => {
    const id = newId();
    expect(IdSchema.parse(id)).toBe(id);
    expect(asId(id)).toBe(id);
  });

  it("odrzuca nie-UUID", () => {
    expect(() => asId("nie-id")).toThrow();
  });
});
