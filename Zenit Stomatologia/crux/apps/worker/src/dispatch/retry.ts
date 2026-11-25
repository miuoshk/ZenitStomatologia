import { plusMs, type Clock } from "@crux/shared/time";

export const MAX_OUTBOX_ATTEMPTS = 8;

/** Następna próba: now + 2^attempts minut. */
export function nextAttemptAt(clock: Clock, attemptsAfterFailure: number): Date {
  const minutes = 2 ** Math.max(0, attemptsAfterFailure);
  return plusMs(clock.now(), minutes * 60_000);
}

export function shouldMarkDead(attemptsAfterFailure: number): boolean {
  return attemptsAfterFailure >= MAX_OUTBOX_ATTEMPTS;
}
