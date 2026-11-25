import type { Actor, Tx } from "@crux/db";
import {
  breakGlassRequests,
  memberships,
  providerCapabilities,
  staffMembers,
  type StaffRole,
} from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { plainDate, type Clock } from "@crux/shared/time";
import { and, eq, sql } from "drizzle-orm";
import { authorize } from "./authorize.js";
import type { AuthAdminPort } from "../ports/auth-admin.js";

export async function createStaffMember(
  tx: Tx,
  actor: Actor,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    title?: string;
    npwz?: string;
    phone?: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  const rows = await tx
    .insert(staffMembers)
    .values({
      tenantId: actor.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      ...(input.title ? { title: input.title } : {}),
      ...(input.npwz ? { npwz: input.npwz } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    })
    .returning({ id: staffMembers.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "staff_insert" } });
  return ok({ id });
}

export async function inviteStaffMember(
  tx: Tx,
  actor: Actor,
  input: {
    staffId: string;
    email: string;
    temporaryPassword: string;
  },
  authAdmin: AuthAdminPort,
): Promise<Result<{ authUserId: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  const created = await authAdmin.createUser({
    email: input.email,
    password: input.temporaryPassword,
  });

  await tx
    .update(staffMembers)
    .set({ authUserId: created.authUserId, updatedAt: sql`now()`, updatedBy: actor.staffId })
    .where(and(eq(staffMembers.id, input.staffId), eq(staffMembers.tenantId, actor.tenantId)));

  return ok({ authUserId: created.authUserId });
}

export async function deactivateStaffMember(
  tx: Tx,
  actor: Actor,
  staffId: string,
  clock: Clock,
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  await tx
    .update(staffMembers)
    .set({
      active: false,
      deactivatedAt: clock.now(),
      updatedAt: sql`now()`,
      updatedBy: actor.staffId,
    })
    .where(and(eq(staffMembers.id, staffId), eq(staffMembers.tenantId, actor.tenantId)));

  return ok({ id: staffId });
}

export async function assignMembership(
  tx: Tx,
  actor: Actor,
  input: {
    staffId: string;
    locationId: string;
    role: StaffRole;
    startsOn: string;
  },
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  const startsOn = plainDate(input.startsOn);
  const rows = await tx
    .insert(memberships)
    .values({
      tenantId: actor.tenantId,
      staffId: input.staffId,
      locationId: input.locationId,
      role: input.role,
      startsOn,
    })
    .returning({ id: memberships.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "membership_insert" } });
  return ok({ id });
}

export async function endMembership(
  tx: Tx,
  actor: Actor,
  membershipId: string,
  endsOn: string,
): Promise<Result<{ id: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  await tx
    .update(memberships)
    .set({ endsOn: plainDate(endsOn) })
    .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, actor.tenantId)));

  return ok({ id: membershipId });
}

export async function setProviderCapabilities(
  tx: Tx,
  actor: Actor,
  staffId: string,
  categories: readonly string[],
): Promise<Result<{ staffId: string }, DomainError>> {
  const authz = await authorize(tx, actor, "staff.manage");
  if (!authz.ok) return authz;

  await tx
    .delete(providerCapabilities)
    .where(
      and(
        eq(providerCapabilities.staffId, staffId),
        eq(providerCapabilities.tenantId, actor.tenantId),
      ),
    );

  if (categories.length > 0) {
    await tx.insert(providerCapabilities).values(
      categories.map((serviceCategory) => ({
        tenantId: actor.tenantId,
        staffId,
        serviceCategory,
      })),
    );
  }

  return ok({ staffId });
}

export async function requestBreakGlass(
  tx: Tx,
  actor: Actor,
  input: { patientId: string; reason: string; grantedUntil: Date },
): Promise<Result<{ id: string }, DomainError>> {
  if (actor.role !== "dentist" && actor.role !== "location_manager") {
    return err({ type: "forbidden", details: { reason: "break_glass_role" } });
  }
  if (!input.reason.trim()) {
    return err({ type: "validation", details: { field: "reason", code: "required" } });
  }

  const rows = await tx
    .insert(breakGlassRequests)
    .values({
      tenantId: actor.tenantId,
      staffId: actor.staffId,
      patientId: input.patientId,
      reason: input.reason,
      grantedUntil: input.grantedUntil,
    })
    .returning({ id: breakGlassRequests.id });
  const id = rows[0]?.id;
  if (!id) return err({ type: "invariant", details: { code: "break_glass_insert" } });
  return ok({ id });
}

export async function listStaff(
  tx: Tx,
  actor: Actor,
  filters: { active?: boolean } = {},
): Promise<Result<Array<{ id: string; email: string; firstName: string; lastName: string }>, DomainError>> {
  const rows = await tx
    .select({
      id: staffMembers.id,
      email: staffMembers.email,
      firstName: staffMembers.firstName,
      lastName: staffMembers.lastName,
    })
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.tenantId, actor.tenantId),
        filters.active === undefined ? sql`true` : eq(staffMembers.active, filters.active),
      ),
    );
  return ok(rows);
}
