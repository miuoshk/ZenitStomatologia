"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { ActionButton, AdminForm, Field, SelectField } from "@/features/settings/admin-form";
import {
  addMembershipAction,
  deactivateAction,
  endMembershipAction,
  inviteAction,
  resetMfaAction,
  saveStaffAction,
} from "./actions";

const CAPABILITIES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"] as const;
const COLORS = ["", "01", "02", "03", "04"].map((c) => ({ value: c, label: c === "" ? "—" : c }));
const ROLE_OPTIONS = Object.entries(L.staff.roles).map(([value, label]) => ({ value, label }));

export type StaffFormValue = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  npwz: string;
  colorKey: string;
  capabilities: string[];
};

export function StaffForm({ value }: { value?: StaffFormValue }) {
  return (
    <AdminForm
      action={saveStaffAction}
      resetOnSuccess={!value}
      submitLabel={value ? L.save : L.staff.create}
      testId={value ? "staff-form" : "staff-new-form"}
    >
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label={L.staff.firstName} defaultValue={value?.firstName ?? ""} />
        <Field name="lastName" label={L.staff.lastName} defaultValue={value?.lastName ?? ""} />
        <Field name="title" label={L.staff.titleField} defaultValue={value?.title ?? ""} />
        <Field
          name="email"
          type="email"
          label={L.staff.email}
          defaultValue={value?.email ?? ""}
          {...(value ? { disabled: true } : {})}
        />
        <Field name="npwz" label={L.staff.npwz} defaultValue={value?.npwz ?? ""} />
        <SelectField name="colorKey" label={L.staff.colorKey} options={COLORS} defaultValue={value?.colorKey ?? ""} />
      </div>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">{L.staff.capabilities}</legend>
        {CAPABILITIES.map((c) => (
          <label key={c} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="capabilities" value={c} defaultChecked={value?.capabilities.includes(c) ?? false} />
            {c}
          </label>
        ))}
      </fieldset>
    </AdminForm>
  );
}

export type MembershipValue = {
  id: string;
  locationLabel: string;
  role: string;
  startsOn: string;
  endsOn: string | null;
};

export function MembershipsPanel({
  staffId,
  items,
  locations,
  today,
}: {
  staffId: string;
  items: MembershipValue[];
  locations: Array<{ id: string; label: string }>;
  today: string;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-[var(--border)] text-sm" data-testid="memberships-list">
        {items.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 py-2">
            <span className="font-semibold">{m.locationLabel}</span>
            <span>{(L.staff.roles as Record<string, string>)[m.role] ?? m.role}</span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {m.startsOn} → {m.endsOn ?? L.staff.ongoing}
            </span>
            {m.endsOn === null ? (
              <span className="ml-auto">
                <ActionButton
                  label={L.staff.endMembership}
                  action={() => endMembershipAction(m.id)}
                  confirm="Zakończyć członkostwo od dziś?"
                />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <AdminForm action={addMembershipAction} resetOnSuccess submitLabel={L.staff.addMembership} testId="membership-form">
        <input type="hidden" name="staffId" value={staffId} />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="locationId"
            label={L.staff.location}
            options={locations.map((l) => ({ value: l.id, label: l.label }))}
            defaultValue={locations[0]?.id ?? ""}
          />
          <SelectField name="role" label={L.staff.role} options={ROLE_OPTIONS} defaultValue="dentist" />
          <Field name="startsOn" type="date" label={L.staff.startsOn} defaultValue={today} />
        </div>
      </AdminForm>
    </div>
  );
}

export function AccountPanel({ staffId, hasAccount, active }: { staffId: string; hasAccount: boolean; active: boolean }) {
  return (
    <div className="space-y-6">
      {!hasAccount && active ? (
        <AdminForm action={() => inviteAction(staffId)} submitLabel={L.staff.invite} testId="invite-form">
          <p className="text-sm text-[var(--text-muted)]">{L.staff.inviteHint}</p>
        </AdminForm>
      ) : null}
      {hasAccount ? (
        <AdminForm action={resetMfaAction} submitLabel={L.staff.resetMfa} variant="secondary" testId="reset-mfa-form" confirm="Zresetować MFA tego pracownika?">
          <input type="hidden" name="staffId" value={staffId} />
          <Field name="reason" label={L.staff.resetMfaReason} defaultValue="" />
        </AdminForm>
      ) : null}
      {active ? (
        <ActionButton
          label={L.staff.deactivate}
          variant="danger"
          confirm={L.staff.deactivateConfirm}
          action={() => deactivateAction(staffId)}
          testId="deactivate-staff"
        />
      ) : null}
    </div>
  );
}
