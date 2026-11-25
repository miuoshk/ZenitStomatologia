import type { DomainError, TechnicalError } from "./result";
import { err, type Result } from "./result";

/** Błąd sterownika Postgres / postgres.js. */
export type PgLikeError = {
  readonly code?: string;
  readonly message?: string;
  readonly constraint?: string;
  readonly detail?: string;
};

/**
 * Mapuje kody SQLSTATE na błędy domenowe.
 * `23505` unique → conflict; `23P01` exclusion → conflict; `42501` → forbidden.
 */
export function mapPgError(error: unknown): Result<never, DomainError | TechnicalError> {
  const pg = asPgError(error);
  if (!pg?.code) {
    return err({ type: "technical", code: "unknown", cause: error });
  }

  switch (pg.code) {
    case "23505":
      return err({
        type: "conflict",
        ...(pg.constraint ? { details: { constraint: pg.constraint } } : {}),
      });
    case "23P01":
      return err({
        type: "conflict",
        details: { constraint: pg.constraint ?? "exclusion" },
      });
    case "42501":
      return err({
        type: "forbidden",
        // Strażnik zamkniętego dnia (migracja 20261126000100) rzuca 42501 z komunikatem `day_closed`.
        details: { reason: pg.message === "day_closed" ? "day_closed" : "insufficient_privilege" },
      });
    default:
      return err({ type: "technical", code: pg.code, cause: error });
  }
}

/**
 * Drizzle (0.45+) opakowuje błąd sterownika w `DrizzleQueryError` z `cause`.
 * Szukamy pierwszego obiektu z kodem SQLSTATE w łańcuchu `cause` (maks. 5 poziomów).
 */
function asPgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") return null;
    const code: unknown = Reflect.get(current, "code");
    if (typeof code === "string") return pgFields(current);
    const cause: unknown = Reflect.get(current, "cause");
    current = cause;
  }
  return null;
}

function pgFields(error: object): PgLikeError {
  const e = error as Record<string, unknown>;
  return {
    ...(typeof e["code"] === "string" ? { code: e["code"] } : {}),
    ...(typeof e["message"] === "string" ? { message: e["message"] } : {}),
    ...(typeof e["constraint"] === "string" ? { constraint: e["constraint"] } : {}),
    ...(typeof e["detail"] === "string" ? { detail: e["detail"] } : {}),
  };
}
