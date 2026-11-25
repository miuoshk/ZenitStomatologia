import type { AuthAdminPort } from "@crux/identity";
import { stableUuid } from "../generators/ids";

export type FakeAuthAdmin = AuthAdminPort & {
  readonly created: Array<{ email: string; authUserId: string }>;
};

/** Atrapa Auth Admin: authUserId deterministyczny z e-maila. */
export function createFakeAuthAdmin(): FakeAuthAdmin {
  const created: FakeAuthAdmin["created"] = [];
  return {
    created,
    createUser({ email }) {
      const authUserId = stableUuid(`auth-user:${email.toLowerCase()}`);
      created.push({ email, authUserId });
      return Promise.resolve({ authUserId });
    },
  };
}
