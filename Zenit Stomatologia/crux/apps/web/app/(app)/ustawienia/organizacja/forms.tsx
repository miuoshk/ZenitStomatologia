"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { ChipToggle } from "@crux/ui";
import { useState } from "react";
import { ActionButton, AdminForm, Field, SelectField } from "@/features/settings/admin-form";
import {
  addChairAction,
  saveExceptionAction,
  saveHoursAction,
  saveLocationAction,
  updateChairAction,
} from "./actions";

const COLORS = ["01", "02", "03", "04"].map((c) => ({ value: c, label: c }));

export type LocationFormValue = {
  id: string;
  number: string;
  name: string;
  street: string;
  city: string;
  postcode: string;
  phone: string;
  email: string;
  colorKey: string;
  openedOn: string;
  active: boolean;
};

export function LocationForm({ value }: { value?: LocationFormValue }) {
  const v = value;
  return (
    <AdminForm action={saveLocationAction} resetOnSuccess={!v} testId={v ? "location-form" : "location-new-form"} submitLabel={v ? L.save : L.org.create}>
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {v ? null : <Field name="number" label={L.org.number} defaultValue="" inputMode="numeric" maxLength={2} />}
        <Field name="name" label={L.org.name} defaultValue={v?.name ?? ""} />
        <Field name="street" label={L.org.street} defaultValue={v?.street ?? ""} />
        <Field name="postcode" label={L.org.postcode} defaultValue={v?.postcode ?? ""} />
        <Field name="city" label={L.org.city} defaultValue={v?.city ?? ""} />
        <Field name="phone" label={L.org.phone} defaultValue={v?.phone ?? ""} />
        <Field name="email" type="email" label={L.org.email} defaultValue={v?.email ?? ""} />
        <SelectField name="colorKey" label={L.org.colorKey} options={COLORS} defaultValue={v?.colorKey ?? "01"} />
        {v ? <Field name="openedOn" type="date" label={L.org.openedOn} defaultValue={v.openedOn} /> : null}
      </div>
      {v ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={v.active} />
          {L.org.active}
        </label>
      ) : null}
    </AdminForm>
  );
}

export type ChairValue = { id: string; name: string; position: number; equipment: string[]; active: boolean };

export function ChairsList({ chairs }: { chairs: ChairValue[] }) {
  if (chairs.length === 0) return <p className="text-sm text-[var(--text-muted)]">{L.org.chairsNone}</p>;
  return (
    <ul className="divide-y divide-[var(--border)]" data-testid="chairs-list">
      {chairs.map((c, i) => {
        const prev = chairs[i - 1];
        const next = chairs[i + 1];
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="w-8 tabular-nums text-[var(--text-muted)]">{c.position}</span>
            <span className={c.active ? "font-semibold" : "text-[var(--text-muted)] line-through"}>{c.name}</span>
            <EquipmentToggles chair={c} />
            <span className="ml-auto flex flex-wrap gap-2">
              {prev ? (
                <ActionButton
                  label={`↑ ${L.org.moveUp}`}
                  variant="ghost"
                  action={async () => {
                    await updateChairAction(prev.id, { position: c.position });
                    return updateChairAction(c.id, { position: prev.position });
                  }}
                />
              ) : null}
              {next ? (
                <ActionButton
                  label={`↓ ${L.org.moveDown}`}
                  variant="ghost"
                  action={async () => {
                    await updateChairAction(next.id, { position: c.position });
                    return updateChairAction(c.id, { position: next.position });
                  }}
                />
              ) : null}
              <ActionButton
                label={c.active ? L.org.deactivate : L.org.activate}
                variant="secondary"
                action={() => updateChairAction(c.id, { active: !c.active })}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EquipmentToggles({ chair }: { chair: ChairValue }) {
  const [selected, setSelected] = useState<string[]>(chair.equipment);
  return (
    <span className="flex flex-wrap gap-1.5" aria-label={L.org.equipment}>
      {L.org.equipmentOptions.map((eq) => (
        <ChipToggle
          key={eq}
          pressed={selected.includes(eq)}
          onPressedChange={(on) => {
            const next = on ? [...selected, eq] : selected.filter((s) => s !== eq);
            setSelected(next);
            void updateChairAction(chair.id, { equipment: next });
          }}
        >
          {eq}
        </ChipToggle>
      ))}
    </span>
  );
}

export function AddChairForm({ locationId, nextPosition }: { locationId: string; nextPosition: number }) {
  return (
    <AdminForm action={addChairAction} resetOnSuccess submitLabel={L.org.addChair} testId="chair-add-form">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={L.org.chairName} defaultValue="" />
        <Field name="position" type="number" min={1} label={L.org.chairPosition} defaultValue={nextPosition} />
      </div>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">{L.org.equipment}</legend>
        {L.org.equipmentOptions.map((eq) => (
          <label key={eq} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="equipment" value={eq} />
            {eq}
          </label>
        ))}
      </fieldset>
    </AdminForm>
  );
}

export type HoursValue = Array<{ opens: string; closes: string } | null>;

export function HoursForm({ locationId, today, hours }: { locationId: string; today: string; hours: HoursValue }) {
  return (
    <AdminForm action={saveHoursAction} testId="hours-form">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-3">
        <Field name="validFrom" type="date" label={L.org.validFrom} defaultValue={today} />
        {L.org.weekdays.map((label, i) => {
          const h = hours[i];
          return (
            <div key={label} className="grid grid-cols-[8rem_1fr_1fr] items-end gap-3">
              <span className="pb-3 text-sm font-semibold">{label}</span>
              <Field name={`opens-${String(i + 1)}`} type="time" label={L.org.opens} defaultValue={h?.opens ?? ""} />
              <Field name={`closes-${String(i + 1)}`} type="time" label={L.org.closes} defaultValue={h?.closes ?? ""} />
            </div>
          );
        })}
      </div>
      <p className="text-sm text-[var(--text-muted)]">{L.org.hoursHint}</p>
    </AdminForm>
  );
}

export function ExceptionForm({ locationId }: { locationId: string }) {
  return (
    <AdminForm action={saveExceptionAction} resetOnSuccess submitLabel={L.org.exceptionAdd} testId="exception-form">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="day" type="date" label={L.org.exceptionDay} defaultValue="" />
        <Field name="reason" label={L.org.exceptionReason} defaultValue="" />
        <Field name="opens" type="time" label={L.org.opens} defaultValue="" />
        <Field name="closes" type="time" label={L.org.closes} defaultValue="" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="closed" />
        {L.org.exceptionClosed}
      </label>
    </AdminForm>
  );
}
