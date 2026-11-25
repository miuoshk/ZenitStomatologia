import { describe, expect, it } from "vitest";
import { generateTestPesel, normalizePesel, validatePesel } from "./pesel.js";

describe("pesel", () => {
  it("normalizePesel usuwa spacje i myślniki", () => {
    expect(normalizePesel("4405-14 0135-9")).toBe("44051401359");
  });

  it("validatePesel — poprawne syntetyczne", () => {
    const female = generateTestPesel({ birthDate: "1990-05-15", sex: "female", serial: 12 });
    const male = generateTestPesel({ birthDate: "2001-12-01", sex: "male", serial: 7 });

    const f = validatePesel(female);
    expect(f).not.toBeNull();
    expect(f?.birthDate).toBe("1990-05-15");
    expect(f?.sex).toBe("female");

    const m = validatePesel(male);
    expect(m).not.toBeNull();
    expect(m?.birthDate).toBe("2001-12-01");
    expect(m?.sex).toBe("male");
  });

  it("validatePesel — błędna suma / długość / data", () => {
    const good = generateTestPesel({ birthDate: "1985-03-20", sex: "male", serial: 1 });
    const badChecksum = good.slice(0, 10) + String((Number(good[10]) + 1) % 10);
    expect(validatePesel(badChecksum)).toBeNull();
    expect(validatePesel("123")).toBeNull();
    expect(validatePesel("abcdefghijk")).toBeNull();
    // niemożliwa data (miesiąc 13 w kodowaniu 1900)
    expect(validatePesel("85133200001")).toBeNull();
  });

  it("PESEL z XXI w. (miesiąc +20)", () => {
    const p = generateTestPesel({ birthDate: "2020-02-29", sex: "female", serial: 0 });
    expect(validatePesel(p)?.birthDate).toBe("2020-02-29");
  });

  it("stulecia 1800 / 2100 / 2200", () => {
    const p18 = generateTestPesel({ birthDate: "1890-06-01", sex: "male", serial: 2 });
    expect(validatePesel(p18)?.birthDate).toBe("1890-06-01");
    const p21 = generateTestPesel({ birthDate: "2105-01-10", sex: "female", serial: 4 });
    expect(validatePesel(p21)?.birthDate).toBe("2105-01-10");
    const p22 = generateTestPesel({ birthDate: "2201-11-11", sex: "male", serial: 5 });
    expect(validatePesel(p22)?.birthDate).toBe("2201-11-11");
  });

  it("generateTestPesel waliduje wejście", () => {
    expect(() => generateTestPesel({ birthDate: "x", sex: "male" })).toThrow();
    expect(() =>
      generateTestPesel({ birthDate: "1700-01-01", sex: "male" }),
    ).toThrow(/zakresem/);
    expect(() =>
      generateTestPesel({ birthDate: "1990-01-01", sex: "female", serial: 1000 }),
    ).toThrow(/serial/);
  });
});
