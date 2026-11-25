"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { useState } from "react";
import { ActionButton, AdminForm, Field, SelectField } from "@/features/settings/admin-form";
import { saveSettingAction, setFlagAction, toggleFlagAction } from "./actions";

export function FlagToggle({ flagKey, locationId, enabled }: { flagKey: string; locationId: string; enabled: boolean }) {
  return (
    <ActionButton
      label={enabled ? `${L.system.on} · ${L.system.toggle}` : `${L.system.off} · ${L.system.toggle}`}
      variant={enabled ? "primary" : "secondary"}
      action={() => toggleFlagAction(flagKey, locationId, !enabled)}
      testId={`flag-${flagKey}`}
    />
  );
}

export function NewFlagForm({ locations }: { locations: Array<{ id: string; label: string }> }) {
  return (
    <AdminForm action={setFlagAction} resetOnSuccess submitLabel={L.system.flagAdd} testId="flag-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="key" label={L.system.flagKey} defaultValue="" />
        <Field name="description" label={L.system.flagDescription} defaultValue="" />
        <SelectField
          name="locationId"
          label={L.system.flagScope}
          options={[{ value: "", label: L.system.scopeTenant }, ...locations.map((l) => ({ value: l.id, label: l.label }))]}
          defaultValue=""
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" />
        {L.system.flagEnabled}
      </label>
    </AdminForm>
  );
}

export function OccupancyModeForm({ locationId, value }: { locationId: string; value: string }) {
  const [mode, setMode] = useState(value);
  const toAppointments = mode === "appointments" && value !== "appointments";
  return (
    <AdminForm action={saveSettingAction} testId={`occupancy-mode-${locationId}`}>
      <input type="hidden" name="key" value="scheduling.occupancy_mode" />
      <input type="hidden" name="locationId" value={locationId} />
      <SelectField
        name="value"
        label={L.system.occupancyMode}
        value={mode}
        onChange={(e) => {
          setMode(e.target.value);
        }}
        options={[
          { value: "manual", label: L.system.occupancyModes.manual },
          { value: "appointments", label: L.system.occupancyModes.appointments },
        ]}
      />
      {toAppointments ? (
        <label className="flex items-start gap-2 text-sm text-[var(--status-uwaga)]" role="alert">
          <input type="checkbox" name="confirmed" className="mt-1" />
          <span>
            {L.system.occupancyWarning} <strong>{L.system.occupancyConfirm}</strong>
          </span>
        </label>
      ) : null}
    </AdminForm>
  );
}

export function TargetForm({
  settingKey,
  locationId,
  value,
  label,
}: {
  settingKey: string;
  locationId: string;
  value: number;
  label: string;
}) {
  return (
    <AdminForm action={saveSettingAction} testId={`target-${settingKey}-${locationId}`}>
      <input type="hidden" name="key" value={settingKey} />
      <input type="hidden" name="locationId" value={locationId} />
      <Field name="value" type="number" step="any" min={0} max={100} label={label} defaultValue={value} />
    </AdminForm>
  );
}
