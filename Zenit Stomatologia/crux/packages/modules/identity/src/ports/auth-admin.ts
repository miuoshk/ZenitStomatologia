/** Port administracji Auth (Supabase) — adapter w K07. */
export type AuthAdminPort = {
  createUser(input: {
    email: string;
    password: string;
  }): Promise<{ authUserId: string }>;
};
