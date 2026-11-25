"use server";

import { AUTH_MESSAGES } from "@crux/i18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthPort } from "@/server/auth-adapter";
import { LOCK_COOKIE } from "@/server/cookies";
import { formString } from "@/server/form";

export type AuthFormState = {
  message: string | null;
};

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const auth = await createAuthPort();
  const result = await auth.signInWithPassword({ email, password });
  if ("error" in result) {
    return {
      message:
        result.error === "invalid_credentials"
          ? AUTH_MESSAGES.invalid_credentials
          : AUTH_MESSAGES.technical,
    };
  }
  if (result.session.mustChangePassword) redirect("/logowanie/haslo");
  if (!result.session.hasTotp || result.session.aal !== "aal2") redirect("/logowanie/mfa");
  redirect("/oblozenie");
}

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formString(formData, "password");
  const confirm = formString(formData, "confirm");
  if (password !== confirm) {
    return { message: "Hasła muszą być takie same." };
  }
  const auth = await createAuthPort();
  const result = await auth.changePassword({ newPassword: password });
  if ("error" in result) {
    return {
      message:
        result.error === "weak_password"
          ? AUTH_MESSAGES.weak_password
          : AUTH_MESSAGES.technical,
    };
  }
  redirect("/logowanie/mfa");
}

export async function verifyTotpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const code = formString(formData, "code");
  const factorId = formString(formData, "factorId");
  const auth = await createAuthPort();
  const result = await auth.verifyTotp({ factorId, code });
  if ("error" in result) {
    return {
      message:
        result.error === "invalid_code"
          ? AUTH_MESSAGES.invalid_code
          : AUTH_MESSAGES.technical,
    };
  }
  const jar = await cookies();
  jar.delete(LOCK_COOKIE);
  redirect("/oblozenie");
}

export async function unlockAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const mode = formString(formData, "mode", "password");
  const auth = await createAuthPort();
  if (mode === "totp") {
    const code = formString(formData, "code");
    const factorId = formString(formData, "factorId");
    const result = await auth.verifyTotp({ factorId, code });
    if ("error" in result) {
      return { message: AUTH_MESSAGES.invalid_code };
    }
  } else {
    const password = formString(formData, "password");
    const session = await auth.getSession();
    if (!session?.email) return { message: AUTH_MESSAGES.session_expired };
    const result = await auth.signInWithPassword({
      email: session.email,
      password,
    });
    if ("error" in result) {
      return { message: AUTH_MESSAGES.invalid_credentials };
    }
  }
  const jar = await cookies();
  jar.delete(LOCK_COOKIE);
  redirect("/oblozenie");
}
