import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { generateTestNpwz, isTestNpwz, isValidNpwz, npwzChecksum } from "./npwz";
import { fakePerson } from "./syllables";

describe("generatory syntetyczne", () => {
  it("[K12] nazwiska deterministyczne dla ziarna", () => {
    expect(fakePerson(createRng(1))).toEqual(fakePerson(createRng(1)));
    expect(fakePerson(createRng(1))).not.toEqual(fakePerson(createRng(2)));
  });

  it("[K12] NPWZ ma poprawną sumę kontrolną i prefiks testowy", () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i += 1) {
      const n = generateTestNpwz(rng);
      expect(isValidNpwz(n)).toBe(true);
      expect(isTestNpwz(n)).toBe(true);
    }
    expect(npwzChecksum("990000")).toBe(5);
    expect(isValidNpwz("1234567")).toBe(false);
  });
});
