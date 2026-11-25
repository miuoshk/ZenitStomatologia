export type Level = "error" | "warn" | "info";

export type Violation = {
  readonly ruleId: string;
  readonly level: Level;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  /** Gdy true — reguła wymaga bazy; CI może oznaczyć `requires-db`. */
  readonly requiresDb?: boolean;
};

export type DoctorContext = {
  readonly root: string;
  readonly allowlist: Allowlist;
  readonly vocabulary: Vocabulary;
  readonly updateLock: boolean;
  /** null gdy brak połączenia z DB. */
  readonly db: DbHandle | null;
};

export type DbHandle = {
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  end(): Promise<void>;
};

export type Allowlist = {
  readonly rules: Record<
    string,
    ReadonlyArray<{
      readonly path?: string;
      readonly pattern?: string;
      readonly table?: string;
      readonly reason: string;
    }>
  >;
};

export type Vocabulary = {
  readonly forbidden: readonly string[];
  readonly pathGlobs: readonly string[];
  readonly ignoreLinePatterns: readonly string[];
};

export type Rule = {
  readonly id: string;
  readonly level: Level;
  readonly description: string;
  readonly requiresDb?: boolean;
  check(ctx: DoctorContext): Promise<Violation[]> | Violation[];
};
