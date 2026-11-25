"use server";

import { randomBytes } from "node:crypto";
import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { memberships, staffMembers, type StaffRole } from "@crux/db/schema";
import {
  assignMembership,
  authorize,
  createStaffMember,
  deactivateStaffMember,
  endMembership,
  inviteStaffMember,
  setProviderCapabilities,
  updateStaffMember,
} from "@crux/identity";
import { recordCommand } from "@crux/platform";
import { err, ok } from "@crux/shared/result";
import { newId } from "@crux/shared/id";
import { systemClock, toLocalDay } from "@crux/shared/time";
import { and, eq, isNull } from "drizzle-orm";
import { fail, runAdmin } from "@/features/settings/run";
import type { AdminState } from "@/features/settings/types";
import { createAuthAdminPort } from "@/server/auth-adapter";
import { formString } from "@/server/form";

const PATH = "/ustawienia/personel";
const REQUIRED = "To pole jest wymagane.";

function opt(fd: FormData, key: string): string | undefined {
  const v = formString(fd, key).trim();
  return v === "" ? undefined : v;
}

export async function saveStaffAction(fd: FormData): Promise<AdminState> {
  const id = formString(fd, "id");
  const firstName = formString(fd, "firstName").trim();
  const lastName = formString(fd, "lastName").trim();
  const email = formString(fd, "email").trim();
  if (!firstName) return fail(REQUIRED, "firstName");
  if (!lastName) return fail(REQUIRED, "lastName");
  if (!id && !/^\S+@\S+\.\S+$/.test(email)) return fail("Podaj poprawny adres e-mail.", "email");
  const categories = fd.getAll("capabilities").filter((v): v is string => typeof v === "string");
  const title = opt(fd, "title");
  const npwz = opt(fd, "npwz");
  const colorKey = opt(fd, "colorKey");
  return runAdmin(
    [PATH],
    async (tx, actor) => {
      const saved = id
        ? await updateStaffMember(tx, actor, id, {
            firstName,
            lastName,
            title: title ?? null,
            npwz: npwz ?? null,
            colorKey: colorKey ?? null,
          })
        : await createStaffMember(tx, actor, {
            firstName,
            lastName,
            email,
            ...(title ? { title } : {}),
            ...(npwz ? { npwz } : {}),
            ...(colorKey ? { colorKey } : {}),
          });
      if (!saved.ok) return saved;
      const caps = await setProviderCapabilities(tx, actor, saved.value.id, categories);
      return caps.ok ? ok(saved.value) : caps;
    },
    () => ({ message: L.staff.saved }),
  );
}

export async function addMembershipAction(fd: FormData): Promise<AdminState> {
  const startsOn = formString(fd, "startsOn");
  if (!startsOn) return fail(REQUIRED, "startsOn");
  const role = formString(fd, "role") as StaffRole;
  return runAdmin(
    [PATH],
    (tx, actor) =>
      assignMembership(tx, actor, {
        staffId: formString(fd, "staffId"),
        locationId: formString(fd, "locationId"),
        role,
        startsOn,
      }),
    () => ({ message: L.saved }),
  );
}

export async function endMembershipAction(membershipId: string): Promise<AdminState> {
  const today = toLocalDay(systemClock.now());
  return runAdmin(
    [PATH],
    (tx, actor) => endMembership(tx, actor, membershipId, today),
    () => ({ message: L.saved }),
  );
}

/** Zaproszenie: konto Auth z hasłem tymczasowym. Hasło wraca tylko w odpowiedzi (nigdy w logach). */
export async function inviteAction(staffId: string): Promise<AdminState> {
  const authAdmin = createAuthAdminPort();
  if (!authAdmin) return fail(L.staff.inviteNoAdmin);
  const temporaryPassword = randomBytes(12).toString("base64url");
  return runAdmin(
    [PATH],
    async (tx, actor) => {
      const rows = await tx
        .select({ email: staffMembers.email, authUserId: staffMembers.authUserId })
        .from(staffMembers)
        .where(and(eq(staffMembers.id, staffId), eq(staffMembers.tenantId, actor.tenantId)))
        .limit(1);
      const row = rows[0];
      if (!row) return err({ type: "not_found" as const });
      if (row.authUserId) return err({ type: "conflict" as const, details: { constraint: "auth_user_exists" } });
      return inviteStaffMember(tx, actor, { staffId, email: row.email, temporaryPassword }, authAdmin);
    },
    () => ({ message: "Konto utworzone.", secret: temporaryPassword }),
  );
}

export async function resetMfaAction(fd: FormData): Promise<AdminState> {
  const reason = formString(fd, "reason").trim();
  if (!reason) return fail(REQUIRED, "reason");
  const staffId = formString(fd, "staffId");
  const authAdmin = createAuthAdminPort();
  if (!authAdmin) return fail(L.staff.inviteNoAdmin);
  return runAdmin(
    [PATH],
    async (tx, actor) => {
      const authz = await authorize(tx, actor, "staff.manage");
      if (!authz.ok) return authz;
      const rows = await tx
        .select({ authUserId: staffMembers.authUserId })
        .from(staffMembers)
        .where(and(eq(staffMembers.id, staffId), eq(staffMembers.tenantId, actor.tenantId)))
        .limit(1);
      const authUserId = rows[0]?.authUserId;
      if (!authUserId) return err({ type: "not_found" as const });
      const { removed } = await authAdmin.resetMfa(authUserId);
      await recordCommand(tx, actor, {
        commandId: newId(),
        name: "identity.reset_mfa",
        result: { staffId, reason, removed },
      });
      return ok({ removed });
    },
    () => ({ message: L.staff.resetMfaDone }),
  );
}

/** Dezaktywacja ≠ usunięcie: active=false + zakończenie otwartych członkostw (ends_on = dziś). */
export async function deactivateAction(staffId: string): Promise<AdminState> {
  const today = toLocalDay(systemClock.now());
  return runAdmin(
    [PATH],
    async (tx, actor) => {
      if (staffId === actor.staffId) {
        return err({ type: "invariant" as const, details: { code: "self_deactivate" } });
      }
      const done = await deactivateStaffMember(tx, actor, staffId, systemClock);
      if (!done.ok) return done;
      const open = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.staffId, staffId), isNull(memberships.endsOn)));
      for (const m of open) await endMembership(tx, actor, m.id, today);
      return done;
    },
    () => ({ message: L.staff.deactivated }),
  );
}
