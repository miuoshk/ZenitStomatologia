import { randInt, type Rng } from "./rng";

/**
 * Syntetyczny NPWZ (7 cyfr). Algorytm sumy kontrolnej jak w rejestrze:
 * cyfra 1 = (1·d2 + 2·d3 + 3·d4 + 4·d5 + 5·d6 + 6·d7) mod 11 (wynik 10 jest nieprawidłowy).
 *
 * PREFIKS TESTOWY: sześciocyfrowy korpus zawsze zaczyna się od „99” (99xxxx).
 * To zakres, który projekt rezerwuje na dane syntetyczne — kolizji z numerem
 * prawdziwego lekarza nie da się wykluczyć w 100% bez dostępu do CRL, dlatego
 * numery te występują wyłącznie przy personelu z domeną `demo.invalid`
 * i nigdy nie trafiają do żadnej integracji (P1/CRL).
 */
export const NPWZ_TEST_PREFIX = "99";

export function npwzChecksum(body6: string): number {
  if (!/^\d{6}$/.test(body6)) throw new RangeError("npwzChecksum: oczekiwano 6 cyfr");
  let sum = 0;
  for (let i = 0; i < 6; i += 1) sum += (i + 1) * Number(body6[i]);
  return sum % 11;
}

export function isValidNpwz(npwz: string): boolean {
  if (!/^\d{7}$/.test(npwz)) return false;
  const check = npwzChecksum(npwz.slice(1));
  return check !== 10 && check === Number(npwz[0]);
}

export function isTestNpwz(npwz: string): boolean {
  return isValidNpwz(npwz) && npwz.slice(1, 3) === NPWZ_TEST_PREFIX;
}

export function generateTestNpwz(rng: Rng): string {
  for (;;) {
    const body = NPWZ_TEST_PREFIX + String(randInt(rng, 0, 9999)).padStart(4, "0");
    const check = npwzChecksum(body);
    if (check !== 10) return String(check) + body;
  }
}
