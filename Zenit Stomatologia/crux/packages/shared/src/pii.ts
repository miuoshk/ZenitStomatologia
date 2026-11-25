import { validatePesel } from "./pesel";

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
/** `+48` + 9 cyfr albo samodzielne 9 cyfr (nie fragment dłuższej liczby). */
const PHONE_PLUS48_RE = /\+48[\s-]?\d{9}\b/;
const PHONE_NINE_RE = /(?<![0-9])\d{9}(?![0-9])/;
const PESEL_CANDIDATE_RE = /(?<![0-9])\d{11}(?![0-9])/g;

/**
 * Wykrywa PESEL (z poprawną sumą), telefon PL i e-mail.
 * Używane przez walidatory notatek (K11) i logger (K16).
 */
export function containsPii(text: string): boolean {
  if (EMAIL_RE.test(text)) return true;
  if (PHONE_PLUS48_RE.test(text)) return true;
  if (hasPesel(text)) return true;
  if (hasBarePhone(text)) return true;
  return false;
}

function hasPesel(text: string): boolean {
  const matches = text.match(PESEL_CANDIDATE_RE);
  if (!matches) return false;
  return matches.some((m) => validatePesel(m) !== null);
}

function hasBarePhone(text: string): boolean {
  // nie licz 11-cyfrowych kandydatów PESEL jako telefonu
  const withoutPesel = text.replace(PESEL_CANDIDATE_RE, " ");
  // odrzuć fragmenty UUID (hex z myślnikami) — szukaj tylko „czystych” 9 cyfr
  const withoutUuid = withoutPesel.replace(
    /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
    " ",
  );
  return PHONE_NINE_RE.test(withoutUuid);
}
