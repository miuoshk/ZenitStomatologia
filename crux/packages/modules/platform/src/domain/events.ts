/** Typy bazowe zdarzeń domenowych (konsument: apps/worker, K09). */

export type DomainEvent<TName extends string, TPayload extends Record<string, unknown>> = {
  readonly name: TName;
  readonly payload: TPayload;
  readonly occurredAt?: Date;
};
