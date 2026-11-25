import type { DomainError } from "@crux/shared/result";

/** Polskie komunikaty błędów domenowych dla UI (K07). */
export const ERROR_MESSAGES: Record<DomainError["type"], string> = {
  conflict: "Ten rekord już istnieje lub koliduje z innym.",
  forbidden: "Brak uprawnień do tej operacji.",
  not_found: "Nie znaleziono.",
  validation: "Sprawdź poprawność danych.",
  invariant: "Operacja nie może być dokończona.",
};

export function messageForDomainError(error: DomainError): string {
  const base = ERROR_MESSAGES[error.type];
  if (error.type === "validation" && error.details?.field) {
    return `${base} (pole: ${error.details.field})`;
  }
  if (error.type === "forbidden" && error.details?.reason) {
    return base;
  }
  return base;
}

export const AUTH_MESSAGES = {
  invalid_credentials: "Nieprawidłowy e-mail lub hasło.",
  invalid_code: "Nieprawidłowy kod MFA.",
  must_change_password: "Zmień hasło, zanim przejdziesz dalej.",
  mfa_required: "Podaj kod z aplikacji uwierzytelniającej.",
  session_expired: "Sesja wygasła. Zaloguj się ponownie.",
  locked: "Ekran zablokowany. Odblokuj hasłem lub kodem MFA.",
  weak_password: "Hasło jest za słabe.",
  technical: "Coś poszło nie tak. Spróbuj ponownie.",
} as const;
