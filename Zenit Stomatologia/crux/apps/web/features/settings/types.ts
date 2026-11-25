export type AdminState = {
  readonly ok: boolean;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
  /** Jednorazowy sekret (hasło zaproszenia) — tylko w odpowiedzi, nigdy w logach. */
  readonly secret?: string;
} | null;
