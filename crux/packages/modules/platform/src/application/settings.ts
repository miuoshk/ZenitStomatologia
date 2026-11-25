import type { Actor, Tx } from "@crux/db";
import { settings } from "@crux/db/schema";
import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getSettingDef, type SettingKey } from "../settings/keys";
import { publishEvent } from "./publish-event";

export async function getSetting(
  tx: Tx,
  actor: Actor,
  key: string,
  locationId?: string,
): Promise<Result<unknown, DomainError>> {
  const def = getSettingDef(key);
  if (!def) {
    return err({ type: "validation", details: { field: "key", code: "unknown_setting" } });
  }

  const loc = def.scope === "location" ? (locationId ?? actor.activeLocationId) : null;

  const rows = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.tenantId, actor.tenantId),
        eq(settings.key, key),
        loc ? eq(settings.locationId, loc) : isNull(settings.locationId),
      ),
    )
    .limit(1);

  if (rows[0]) return ok(rows[0].value);
  return ok(def.defaultValue);
}

export async function setSetting(
  tx: Tx,
  actor: Actor,
  key: string,
  value: unknown,
  locationId?: string,
): Promise<Result<{ key: string }, DomainError>> {
  const def = getSettingDef(key);
  if (!def) {
    return err({ type: "validation", details: { field: "key", code: "unknown_setting" } });
  }

  const parsed = def.schema.safeParse(value);
  if (!parsed.success) {
    return err({ type: "validation", details: { field: "value", code: "schema" } });
  }

  if (!actor.permissions.includes("settings.manage")) {
    return err({ type: "forbidden", details: { reason: "settings.manage" } });
  }

  const loc =
    def.scope === "location" ? (locationId ?? actor.activeLocationId) : undefined;

  if (def.scope === "location" && !loc) {
    return err({ type: "validation", details: { field: "locationId", code: "required" } });
  }

  // upsert via delete+insert or on conflict — PK (tenant_id, scope_location_id, key)
  const existing = await tx
    .select({ key: settings.key })
    .from(settings)
    .where(
      and(
        eq(settings.tenantId, actor.tenantId),
        eq(settings.key, key),
        loc ? eq(settings.locationId, loc) : isNull(settings.locationId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await tx
      .update(settings)
      .set({
        value: parsed.data,
        updatedAt: sql`now()`,
        updatedBy: actor.staffId,
      })
      .where(
        and(
          eq(settings.tenantId, actor.tenantId),
          eq(settings.key, key),
          loc ? eq(settings.locationId, loc) : isNull(settings.locationId),
        ),
      );
  } else {
    await tx.insert(settings).values({
      tenantId: actor.tenantId,
      ...(loc ? { locationId: loc } : {}),
      key,
      value: parsed.data,
      updatedAt: sql`now()`,
      updatedBy: actor.staffId,
    });
  }

  await publishEvent(
    tx,
    actor,
    "platform.setting_changed.v1",
    {
      tenantId: actor.tenantId,
      ...(loc ? { locationId: loc } : {}),
      settingKey: key,
    },
    { dedupeKey: `setting:${actor.tenantId}:${loc ?? "tenant"}:${key}` },
  );

  return ok({ key: key as SettingKey });
}
