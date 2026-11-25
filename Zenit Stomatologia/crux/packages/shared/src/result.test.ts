import { describe, expect, it } from "vitest";
import { andThen, err, isOk, map, ok, unwrapOr } from "./result.js";

describe("Result", () => {
  it("ok / err / isOk / map / andThen / unwrapOr", () => {
    const a = ok(2);
    expect(isOk(a)).toBe(true);
    expect(map(a, (n) => n * 3)).toEqual(ok(6));
    expect(andThen(a, (n) => ok(n + 1))).toEqual(ok(3));
    expect(andThen(a, () => err("x"))).toEqual(err("x"));
    expect(unwrapOr(err("e"), 9)).toBe(9);
    expect(unwrapOr(ok(1), 9)).toBe(1);
  });
});
