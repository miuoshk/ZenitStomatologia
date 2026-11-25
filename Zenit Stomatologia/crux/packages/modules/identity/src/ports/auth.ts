/** Port Auth (Supabase) — logowanie, MFA, sesja. Adapter w apps/web. */

export type AuthSession = {
  readonly userId: string;
  readonly email: string | null;
  /** Assurance level: aal1 (hasło) lub aal2 (MFA). */
  readonly aal: "aal1" | "aal2";
  /** Wymuszona zmiana hasła przy pierwszym logowaniu. */
  readonly mustChangePassword: boolean;
  /** Czy użytkownik ma zarejestrowany TOTP. */
  readonly hasTotp: boolean;
};

export type TotpEnrollment = {
  readonly factorId: string;
  readonly qrCode: string;
  readonly secret: string;
};

export type AuthPort = {
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<{ session: AuthSession } | { error: "invalid_credentials" | "technical" }>;

  verifyTotp(input: {
    factorId: string;
    code: string;
  }): Promise<{ session: AuthSession } | { error: "invalid_code" | "technical" }>;

  enrollTotp(): Promise<TotpEnrollment | { error: "technical" }>;

  getSession(): Promise<AuthSession | null>;

  signOut(): Promise<void>;

  changePassword(input: {
    newPassword: string;
  }): Promise<{ ok: true } | { error: "weak_password" | "technical" }>;
};
