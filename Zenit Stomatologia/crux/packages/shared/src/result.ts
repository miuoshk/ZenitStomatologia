/** Wynik operacji domenowej — sukces albo błąd, bez wyjątków w ścieżce biznesowej. */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

/** Błąd domenowy (unia dyskryminowana). `details` bez danych osobowych. */
export type DomainError =
  | { readonly type: "conflict"; readonly details?: { readonly constraint?: string } }
  | { readonly type: "forbidden"; readonly details?: { readonly reason?: string } }
  | { readonly type: "not_found"; readonly details?: { readonly entity?: string } }
  | { readonly type: "validation"; readonly details?: { readonly field?: string; readonly code?: string } }
  | { readonly type: "invariant"; readonly details?: { readonly code?: string } };

/** Awaria techniczna (sieć, baza, KMS) — poza ścieżką domenową. */
export type TechnicalError = {
  readonly type: "technical";
  readonly code: string;
  readonly cause?: unknown;
};

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (!result.ok) return result;
  return ok(fn(result.value));
}

export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (!result.ok) return result;
  return fn(result.value);
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
