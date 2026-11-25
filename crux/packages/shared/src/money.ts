/**
 * Pieniądze w groszach (`bigint`), waluta PLN.
 * Żadnych `number` w API publicznym poza `toGroszeNumber()` (tylko prezentacja).
 */

const CURRENCY = "PLN" as const;

export type MoneyJson = {
  readonly grosze: string;
  readonly currency: typeof CURRENCY;
};

export class Money {
  readonly #grosze: bigint;

  private constructor(grosze: bigint) {
    this.#grosze = grosze;
  }

  static fromGrosze(grosze: bigint): Money {
    return new Money(grosze);
  }

  /** Parsuje kwotę PLN z kropką lub przecinkiem, np. `'120.50'` / `'1 234,50'`. */
  static fromPln(pln: string): Money {
    const normalized = pln.replace(/\s/g, "").replace(",", ".");
    if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new RangeError(`Money.fromPln: nieprawidłowa kwota '${pln}'`);
    }
    const negative = normalized.startsWith("-");
    const abs = negative ? normalized.slice(1) : normalized;
    const [wholeRaw, fracRaw = ""] = abs.split(".");
    const whole = wholeRaw ?? "0";
    const frac = (fracRaw + "00").slice(0, 2);
    const grosze = BigInt(whole) * 100n + BigInt(frac);
    return new Money(negative ? -grosze : grosze);
  }

  get currency(): typeof CURRENCY {
    return CURRENCY;
  }

  toGrosze(): bigint {
    return this.#grosze;
  }

  /**
   * Tylko do prezentacji (wykresy, API liczbowe UI).
   * Nie używać w arytmetyce domenowej — precyzja `number` gubi grosze powyżej ~2^53.
   */
  toGroszeNumber(): number {
    return Number(this.#grosze);
  }

  add(other: Money): Money {
    return new Money(this.#grosze + other.#grosze);
  }

  subtract(other: Money): Money {
    return new Money(this.#grosze - other.#grosze);
  }

  /**
   * Procent kwoty, np. `multiply('12.5')` = 12,5 % z zaokrągleniem bankowym
   * (half to even) do pełnego grosza.
   */
  multiply(percent: string): Money {
    const ratio = parseDecimalFixed(percent, 6); // percent * 10^6
    // grosze * percent / 100 = grosze * ratio / (100 * 10^6)
    const scaled = this.#grosze * ratio.mantissa;
    const divisor = 100n * 10n ** BigInt(ratio.scale);
    return new Money(divRoundBankers(scaled, divisor));
  }

  /**
   * Podział wg wag bez gubienia grosza (metoda największej reszty).
   * `Money.fromGrosze(100n).allocate([1,1,1])` → 34 / 33 / 33.
   */
  allocate(weights: readonly number[]): Money[] {
    if (weights.length === 0) {
      throw new RangeError("Money.allocate: puste wagi");
    }
    if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
      throw new RangeError("Money.allocate: wagi muszą być nieujemnymi liczbami całkowitymi");
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) {
      throw new RangeError("Money.allocate: suma wag = 0");
    }

    const total = this.#grosze;
    const sign = total < 0n ? -1n : 1n;
    const absTotal = total < 0n ? -total : total;

    const raw = weights.map((w) => {
      const product = absTotal * BigInt(w);
      const whole = product / BigInt(totalWeight);
      const remainder = product % BigInt(totalWeight);
      return { whole, remainder };
    });

    const distributed = raw.reduce((s, r) => s + r.whole, 0n);
    let leftover = absTotal - distributed;

    // Największa reszta; przy remisie niższy indeks (stabilnie → 34/33/33 dla równych wag).
    const order = raw
      .map((r, index) => ({ index, remainder: r.remainder }))
      .sort((a, b) => {
        if (a.remainder === b.remainder) return a.index - b.index;
        return a.remainder > b.remainder ? -1 : 1;
      });

    const parts = raw.map((r) => r.whole);
    for (const { index } of order) {
      if (leftover <= 0n) break;
      const at = parts[index];
      if (at === undefined) continue;
      parts[index] = at + 1n;
      leftover -= 1n;
    }

    return parts.map((p) => new Money(p * sign));
  }

  /** `1 234,50 zł` */
  format(): string {
    const neg = this.#grosze < 0n;
    const abs = neg ? -this.#grosze : this.#grosze;
    const whole = abs / 100n;
    const frac = abs % 100n;
    const wholeStr = insertThousands(whole.toString());
    const fracStr = frac.toString().padStart(2, "0");
    return `${neg ? "-" : ""}${wholeStr},${fracStr} zł`;
  }

  /**
   * Do kafli: `412 tys. zł`, `1,2 mln zł`.
   * Poniżej 10 000 PLN — zwykły `format()`.
   */
  formatShort(): string {
    const neg = this.#grosze < 0n;
    const absPln = (this.#grosze < 0n ? -this.#grosze : this.#grosze) / 100n;
    const sign = neg ? "-" : "";

    if (absPln < 10_000n) {
      return this.format();
    }
    if (absPln < 1_000_000n) {
      const tys = absPln / 1_000n;
      return `${sign}${tys.toString()} tys. zł`;
    }
    // mln z jednym miejscem, przecinek PL; half-up na 0,1 mln
    const tenthMln = (absPln * 10n + 500_000n) / 1_000_000n;
    const whole = tenthMln / 10n;
    const frac = tenthMln % 10n;
    if (frac === 0n) {
      return `${sign}${whole.toString()} mln zł`;
    }
    return `${sign}${whole.toString()},${frac.toString()} mln zł`;
  }

  equals(other: Money): boolean {
    return this.#grosze === other.#grosze;
  }

  toJSON(): MoneyJson {
    return { grosze: this.#grosze.toString(), currency: CURRENCY };
  }

  toString(): string {
    return this.format();
  }
}

function insertThousands(digits: string): string {
  const rev = digits.split("").reverse();
  const parts: string[] = [];
  for (let i = 0; i < rev.length; i += 3) {
    parts.push(rev.slice(i, i + 3).reverse().join(""));
  }
  return parts.reverse().join(" ");
}

function parseDecimalFixed(
  value: string,
  maxScale: number,
): { mantissa: bigint; scale: number } {
  const normalized = value.replace(",", ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new RangeError(`Money: nieprawidłowa liczba dziesiętna '${value}'`);
  }
  const negative = normalized.startsWith("-");
  const abs = negative ? normalized.slice(1) : normalized;
  const [wholeRaw, fracRaw = ""] = abs.split(".");
  if (fracRaw.length > maxScale) {
    throw new RangeError(`Money: zbyt wiele miejsc po przecinku w '${value}'`);
  }
  const scale = fracRaw.length;
  const whole = wholeRaw ?? "0";
  const mantissa = BigInt(`${whole}${fracRaw}`) * (negative ? -1n : 1n);
  return { mantissa, scale };
}

/** Dzielenie całkowite z zaokrągleniem bankowym (half to even). */
export function divRoundBankers(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError("dzielenie przez zero");
  const sign = numerator < 0n !== denominator < 0n ? -1n : 1n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const r = n % d;
  if (r * 2n < d) return q * sign;
  if (r * 2n > d) return (q + 1n) * sign;
  // dokładnie w połowie → do parzystego
  return (q % 2n === 0n ? q : q + 1n) * sign;
}
