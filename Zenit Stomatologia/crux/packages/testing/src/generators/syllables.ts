import { pick, randInt, type Rng } from "./rng";

/**
 * Generator imion i nazwisk z sylab — wyłącznie nonsens „polsko-brzmiący”.
 * Nie korzysta z list prawdziwych imion/nazwisk; sylaby są dobrane tak, by
 * rzadko składać się w istniejące imię (końcówki -ux/-ek/-ar itd. + rzadkie zbitki).
 * Domena e-mail: `demo.invalid` (RFC 2606) — nigdy realna skrzynka.
 */
const ONSETS = ["vr", "zh", "tl", "kr", "gw", "dz", "shk", "brz", "pf", "chm", "fl", "zn", "ql"] as const;
const VOWELS = ["a", "e", "i", "o", "u", "y"] as const;
const CODAS = ["", "", "n", "r", "l", "s", "k", "m"] as const;

const FIRST_ENDINGS = ["ux", "ek", "ar", "ik", "um", "oz"] as const;
const LAST_ENDINGS = ["ewux", "ański", "ymek", "orzak", "uwik", "elski", "ydar"] as const;

function syllable(rng: Rng): string {
  return pick(rng, ONSETS) + pick(rng, VOWELS) + pick(rng, CODAS);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fakeFirstName(rng: Rng): string {
  const n = randInt(rng, 1, 2);
  let s = "";
  for (let i = 0; i < n; i += 1) s += syllable(rng);
  return capitalize(s + pick(rng, FIRST_ENDINGS));
}

export function fakeLastName(rng: Rng): string {
  const n = randInt(rng, 1, 2);
  let s = "";
  for (let i = 0; i < n; i += 1) s += syllable(rng);
  return capitalize(s + pick(rng, LAST_ENDINGS));
}

export type FakePerson = { firstName: string; lastName: string };

export function fakePerson(rng: Rng): FakePerson {
  return { firstName: fakeFirstName(rng), lastName: fakeLastName(rng) };
}
