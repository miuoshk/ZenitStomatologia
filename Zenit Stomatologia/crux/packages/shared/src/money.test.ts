import { describe, expect, it } from "vitest";
import { divRoundBankers, Money } from "./money.js";

describe("Money", () => {
  it("fromPln / fromGrosze / format", () => {
    expect(Money.fromPln("120.50").toGrosze()).toBe(12050n);
    expect(Money.fromPln("1 234,50").format()).toBe("1 234,50 zł");
    expect(Money.fromGrosze(-99n).format()).toBe("-0,99 zł");
  });

  it("add / subtract", () => {
    const a = Money.fromPln("10.00");
    const b = Money.fromPln("2.50");
    expect(a.add(b).format()).toBe("12,50 zł");
    expect(a.subtract(b).format()).toBe("7,50 zł");
  });

  it("allocate([1,1,1]) dla 100 groszy → 34/33/33", () => {
    const parts = Money.fromGrosze(100n).allocate([1, 1, 1]);
    expect(parts.map((p) => p.toGrosze())).toEqual([34n, 33n, 33n]);
  });

  it("allocate zachowuje sumę", () => {
    const m = Money.fromGrosze(1000n);
    const parts = m.allocate([2, 3, 5]);
    const sum = parts.reduce((s, p) => s + p.toGrosze(), 0n);
    expect(sum).toBe(1000n);
  });

  it("multiply z zaokrągleniem bankowym (half to even)", () => {
    // 1 grosz * 50% = 0.5 → do parzystego 0
    expect(Money.fromGrosze(1n).multiply("50").toGrosze()).toBe(0n);
    // 3 grosze * 50% = 1.5 → do parzystego 2
    expect(Money.fromGrosze(3n).multiply("50").toGrosze()).toBe(2n);
    // 100 * 12.5% = 12.5 → 12 (12 even) — wait 12.5 half to even from 12.5 → 12 is even
    expect(Money.fromGrosze(100n).multiply("12.5").toGrosze()).toBe(12n);
    // 100 * 12.6% = 12.6 → 13
    expect(Money.fromGrosze(100n).multiply("12.6").toGrosze()).toBe(13n);
  });

  it("divRoundBankers", () => {
    expect(divRoundBankers(5n, 2n)).toBe(2n); // 2.5 → 2 even
    expect(divRoundBankers(7n, 2n)).toBe(4n); // 3.5 → 4 even
    expect(divRoundBankers(1n, 2n)).toBe(0n); // 0.5 → 0 even
  });

  it("formatShort", () => {
    expect(Money.fromPln("412000").formatShort()).toBe("412 tys. zł");
    expect(Money.fromPln("1200000").formatShort()).toBe("1,2 mln zł");
    expect(Money.fromPln("50.00").formatShort()).toBe("50,00 zł");
  });

  it("JSON serializuje grosze jako string", () => {
    const json = JSON.stringify(Money.fromPln("10.00"));
    expect(json).toBe('{"grosze":"1000","currency":"PLN"}');
  });

  it("toGroszeNumber tylko do prezentacji", () => {
    expect(Money.fromGrosze(42n).toGroszeNumber()).toBe(42);
  });

  it("equals / toString / currency / błędy wejścia", () => {
    const a = Money.fromPln("1.00");
    expect(a.equals(Money.fromGrosze(100n))).toBe(true);
    expect(a.toString()).toBe("1,00 zł");
    expect(a.currency).toBe("PLN");
    expect(() => Money.fromPln("1.234")).toThrow(/nieprawidłowa/);
    expect(() => Money.fromPln("abc")).toThrow();
    expect(() => Money.fromGrosze(1n).allocate([])).toThrow(/puste/);
    expect(() => Money.fromGrosze(1n).allocate([-1])).toThrow(/nieujemnymi/);
    expect(() => Money.fromGrosze(1n).allocate([0, 0])).toThrow(/suma wag/);
    expect(() => Money.fromGrosze(1n).multiply("x")).toThrow();
    expect(() => Money.fromGrosze(1n).multiply("1.1234567")).toThrow(/miejsc/);
    expect(() => divRoundBankers(1n, 0n)).toThrow(/zero/);
  });

  it("formatShort: ujemne tys., równe mln, ujemne mln", () => {
    expect(Money.fromPln("-412000").formatShort()).toBe("-412 tys. zł");
    expect(Money.fromPln("2000000").formatShort()).toBe("2 mln zł");
    expect(Money.fromPln("-1200000").formatShort()).toBe("-1,2 mln zł");
  });

  it("allocate ujemnej kwoty zachowuje znak", () => {
    const parts = Money.fromGrosze(-100n).allocate([1, 1, 1]);
    expect(parts.map((p) => p.toGrosze())).toEqual([-34n, -33n, -33n]);
  });
});
