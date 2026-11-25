import type { AuthAdminPort, AuthPort, AuthSession, TotpEnrollment } from "@crux/identity";
import QRCode from "qrcode";
import type { Factor, SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase";

function isVerifiedTotp(factor: Factor): boolean {
  return factor.factor_type === "totp" && factor.status === "verified";
}

function mustChangeFromMeta(user: User): boolean {
  const meta = user.user_metadata as Record<string, unknown>;
  const flag = meta["must_change_password"];
  return flag === true || flag === "true";
}

async function toSession(client: SupabaseClient, user: User): Promise<AuthSession> {
  const aalResult = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  const current = aalResult.data?.currentLevel === "aal2" ? "aal2" : "aal1";

  const factorsResult = await client.auth.mfa.listFactors();
  const totpFactors = factorsResult.data?.totp ?? [];
  const hasTotp = totpFactors.some(isVerifiedTotp);

  return {
    userId: user.id,
    email: user.email ?? null,
    aal: current,
    mustChangePassword: mustChangeFromMeta(user),
    hasTotp,
  };
}

export async function createAuthPort(): Promise<AuthPort> {
  const client = await createSupabaseServerClient();

  return {
    async signInWithPassword({ email, password }) {
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) {
        const msg = result.error.message.toLowerCase();
        if (msg.includes("invalid")) {
          return { error: "invalid_credentials" as const };
        }
        return { error: "technical" as const };
      }
      return { session: await toSession(client, result.data.user) };
    },

    async verifyTotp({ factorId, code }) {
      const result = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) {
        return { error: "invalid_code" as const };
      }
      return { session: await toSession(client, result.data.user) };
    },

    async enrollTotp(): Promise<TotpEnrollment | { error: "technical" }> {
      const result = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Crux",
      });
      if (result.error) return { error: "technical" };
      const enrolled = result.data;
      const qrCode = await QRCode.toDataURL(enrolled.totp.uri);
      return {
        factorId: enrolled.id,
        qrCode,
        secret: enrolled.totp.secret,
      };
    },

    async getSession() {
      const result = await client.auth.getUser();
      if (result.error) return null;
      return toSession(client, result.data.user);
    },

    async signOut() {
      await client.auth.signOut();
    },

    async changePassword({ newPassword }) {
      if (newPassword.length < 12) return { error: "weak_password" as const };
      const result = await client.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });
      if (result.error) {
        if (result.error.message.toLowerCase().includes("password")) {
          return { error: "weak_password" as const };
        }
        return { error: "technical" as const };
      }
      return { ok: true as const };
    },
  };
}

export async function getTotpFactorId(): Promise<string | null> {
  const client = await createSupabaseServerClient();
  const result = await client.auth.mfa.listFactors();
  const totpFactors = result.data?.totp ?? [];
  const verified = totpFactors.find(isVerifiedTotp);
  if (verified) return verified.id;
  return totpFactors[0]?.id ?? null;
}

export function createAuthAdminPort(): AuthAdminPort | null {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  return {
    async createUser({ email, password }) {
      const result = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { authUserId: result.data.user.id };
    },
  };
}
