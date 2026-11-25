/** Walidacja i normalizacja PESEL (używane od F1.1; testowane już w K03). */

export type PeselSex = "female" | "male";

export type PeselInfo = {
  readonly normalized: string;
  readonly birthDate: string; // YYYY-MM-DD
  readonly sex: PeselSex;
};

const WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3] as const;

export function normalizePesel(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function validatePesel(raw: string): PeselInfo | null {
  const normalized = normalizePesel(raw);
  if (!/^\d{11}$/.test(normalized)) return null;

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const digit = Number(normalized[i]);
    const weight = WEIGHTS[i];
    if (weight === undefined) return null;
    sum += digit * weight;
  }
  const checksum = (10 - (sum % 10)) % 10;
  if (checksum !== Number(normalized[10])) return null;

  const birthDate = decodeBirthDate(normalized);
  if (!birthDate) return null;

  const sexDigit = Number(normalized[9]);
  const sex: PeselSex = sexDigit % 2 === 0 ? "female" : "male";

  return { normalized, birthDate, sex };
}

function decodeBirthDate(pesel: string): string | null {
  const yy = Number(pesel.slice(0, 2));
  const mmRaw = Number(pesel.slice(2, 4));
  const dd = Number(pesel.slice(4, 6));

  let century: number;
  let month: number;
  if (mmRaw >= 1 && mmRaw <= 12) {
    century = 1900;
    month = mmRaw;
  } else if (mmRaw >= 21 && mmRaw <= 32) {
    century = 2000;
    month = mmRaw - 20;
  } else if (mmRaw >= 41 && mmRaw <= 52) {
    century = 2100;
    month = mmRaw - 40;
  } else if (mmRaw >= 61 && mmRaw <= 72) {
    century = 2200;
    month = mmRaw - 60;
  } else if (mmRaw >= 81 && mmRaw <= 92) {
    century = 1800;
    month = mmRaw - 80;
  } else {
    return null;
  }

  const year = century + yy;
  if (!isValidYmd(year, month, dd)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const dim = daysInMonth(year, month);
  return day <= dim;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/** Generator syntetycznych PESEL-i do testów (nie używać w produkcji). */
export function generateTestPesel(opts: {
  birthDate: string; // YYYY-MM-DD
  sex: PeselSex;
  serial?: number; // 0–999
}): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.birthDate);
  if (!match) throw new RangeError("generateTestPesel: zła data");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const yy = year % 100;
  let mm = month;
  if (year >= 1800 && year <= 1899) mm += 80;
  else if (year >= 2000 && year <= 2099) mm += 20;
  else if (year >= 2100 && year <= 2199) mm += 40;
  else if (year >= 2200 && year <= 2299) mm += 60;
  else if (year < 1900 || year > 2299) throw new RangeError("generateTestPesel: wiek poza zakresem");

  const serial = opts.serial ?? 0;
  if (serial < 0 || serial > 999) throw new RangeError("serial 0–999");
  let sexDigit = (serial % 5) * 2; // even
  if (opts.sex === "male") sexDigit += 1;
  // serial encoded in digits 6–8, sex in 9
  const body =
    String(yy).padStart(2, "0") +
    String(mm).padStart(2, "0") +
    String(day).padStart(2, "0") +
    String(serial).padStart(3, "0") +
    String(sexDigit);

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const weight = WEIGHTS[i];
    if (weight === undefined) throw new Error("weights");
    sum += Number(body[i]) * weight;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return body + String(checksum);
}
