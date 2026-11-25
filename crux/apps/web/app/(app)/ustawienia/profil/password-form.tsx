"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { AdminForm, Field } from "@/features/settings/admin-form";
import { changeOwnPasswordAction } from "./actions";

export function OwnPasswordForm() {
  return (
    <AdminForm action={changeOwnPasswordAction} resetOnSuccess testId="password-form">
      <Field name="password" type="password" autoComplete="new-password" label={L.profile.newPassword} defaultValue="" />
      <Field name="confirm" type="password" autoComplete="new-password" label={L.profile.confirmPassword} defaultValue="" />
    </AdminForm>
  );
}
