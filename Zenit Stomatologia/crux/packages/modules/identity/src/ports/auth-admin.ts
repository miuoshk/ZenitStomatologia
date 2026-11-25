/** Port administracji Auth (Supabase) — adapter w apps/web/server/auth-adapter.ts (K07/K15). */
export type AuthAdminPort = {
  createUser(input: {
    email: string;
    password: string;
  }): Promise<{ authUserId: string }>;
  /** Usuwa zarejestrowane czynniki MFA (użytkownik zarejestruje TOTP ponownie). */
  resetMfa(authUserId: string): Promise<{ removed: number }>;
};
