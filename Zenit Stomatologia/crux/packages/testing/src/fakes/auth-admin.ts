import type { AuthAdminPort } from "@crux/identity";
import { stableUuid } from "../generators/ids";

export type FakeAuthAdmin = AuthAdminPort & {
  readonly created: Array<{ email: string; authUserId: string }>;
  readonly mfaResets: string[];
};

/** Atrapa Auth Admin: authUserId deterministyczny z e-maila. */
export function createFakeAuthAdmin(): FakeAuthAdmin {
  const created: FakeAuthAdmin["created"] = [];
  const mfaResets: string[] = [];
  return {
    created,
    mfaResets,
    resetMfa(authUserId) {
      mfaResets.push(authUserId);
      return Promise.resolve({ removed: 1 });
    },
    createUser({ email }) {
      const authUserId = stableUuid(`auth-user:${email.toLowerCase()}`);
      created.push({ email, authUserId });
      return Promise.resolve({ authUserId });
    },
  };
}
