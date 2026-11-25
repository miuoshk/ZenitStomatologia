import type { Actor, Tx } from "@crux/db";
import type { StaffRole } from "@crux/db/schema";
import { assignMembership, createStaffMember } from "@crux/identity";
import type { DomainError, Result } from "@crux/shared/result";
import { generateTestNpwz } from "../generators/npwz";
import type { Rng } from "../generators/rng";
import { fakePerson } from "../generators/syllables";

export type StaffParams = {
  key: string;
  role: StaffRole;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  npwz?: string;
};

/** Personel z imionami z sylab; dentysta dostaje syntetyczny NPWZ (prefiks testowy). */
export function staffFactory(
  rng: Rng,
  key: string,
  role: StaffRole = "dentist",
  overrides: Partial<StaffParams> = {},
): StaffParams {
  const person = fakePerson(rng);
  const isDentist = role === "dentist";
  return {
    key,
    role,
    ...person,
    email: `${key}@demo.invalid`,
    ...(isDentist ? { title: "lek. dent.", npwz: generateTestNpwz(rng) } : {}),
    ...overrides,
  };
}

export async function persistStaff(
  tx: Tx,
  actor: Actor,
  params: StaffParams,
  membership?: { locationId: string; startsOn: string },
): Promise<Result<{ id: string }, DomainError>> {
  const created = await createStaffMember(tx, actor, {
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    ...(params.title ? { title: params.title } : {}),
    ...(params.npwz ? { npwz: params.npwz } : {}),
  });
  if (!created.ok || !membership) return created;
  const m = await assignMembership(tx, actor, {
    staffId: created.value.id,
    locationId: membership.locationId,
    role: params.role,
    startsOn: membership.startsOn,
  });
  return m.ok ? created : m;
}
