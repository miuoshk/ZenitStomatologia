import type { DomainError, TechnicalError } from "@crux/shared/result";

/** Błąd domenowy/techniczny opakowany w `Error` (eslint `only-throw-error`). */
export class DbMappedError extends Error {
  readonly mapped: DomainError | TechnicalError;

  constructor(mapped: DomainError | TechnicalError) {
    const message =
      mapped.type === "technical"
        ? `technical:${mapped.code}`
        : mapped.type === "forbidden"
          ? `forbidden:${mapped.details?.reason ?? mapped.type}`
          : mapped.type;
    super(message);
    this.name = "DbMappedError";
    this.mapped = mapped;
  }
}

export function isDbMappedError(error: unknown): error is DbMappedError {
  return error instanceof DbMappedError;
}
