import { type AnyPgColumn, pgPolicy, type PgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

type TenantTable = { tenantId: AnyPgColumn };
type LocationTable = TenantTable & { locationId: AnyPgColumn };
type ProviderTable = TenantTable & { providerId: AnyPgColumn };

/**
 * Helpery `pgPolicy` wg wzorców z `docs/03a`, sekcja 0.
 * Claims: `extensions.*` (K02 — migrator nie ma CREATE na `auth`).
 */
export const rls = {
  /** Dane wspólne dla tenanta (patients, plans, charges…). */
  tenantAll(table: TenantTable, namePrefix: string): PgPolicy[] {
    const using = sql`${table.tenantId} = extensions.tenant_id()`;
    return [
      pgPolicy(`${namePrefix}_tenant_all`, {
        as: "permissive",
        for: "all",
        to: "authenticated",
        using,
        withCheck: using,
      }),
    ];
  },

  /** Dane operacyjne gabinetu (appointments, lab_orders, payments). */
  tenantLocation(table: LocationTable, namePrefix: string): PgPolicy[] {
    const using = sql`${table.tenantId} = extensions.tenant_id()
      and (
        ${table.locationId} = any (extensions.location_ids())
        or extensions.has_permission('network.view')
      )`;
    return [
      pgPolicy(`${namePrefix}_tenant_location`, {
        as: "permissive",
        for: "all",
        to: "authenticated",
        using,
        withCheck: using,
      }),
    ];
  },

  /** Tylko select + insert (wersje, zgody, płatności, audyt). */
  appendOnly(table: TenantTable, namePrefix: string): PgPolicy[] {
    const using = sql`${table.tenantId} = extensions.tenant_id()`;
    return [
      pgPolicy(`${namePrefix}_append_select`, {
        as: "permissive",
        for: "select",
        to: "authenticated",
        using,
      }),
      pgPolicy(`${namePrefix}_append_insert`, {
        as: "permissive",
        for: "insert",
        to: "authenticated",
        withCheck: using,
      }),
    ];
  },

  /** Dane wykonawcy: własne albo `settlement.view_all`. */
  selfOrManager(table: ProviderTable, namePrefix: string): PgPolicy[] {
    const using = sql`${table.tenantId} = extensions.tenant_id()
      and (
        ${table.providerId} = extensions.staff_id()
        or extensions.has_permission('settlement.view_all')
      )`;
    return [
      pgPolicy(`${namePrefix}_self_or_manager`, {
        as: "permissive",
        for: "all",
        to: "authenticated",
        using,
        withCheck: using,
      }),
    ];
  },
};

export type TableCommentOpts = {
  readonly rls: string;
  readonly appendOnly: boolean;
  readonly retention: string;
};

/** Komentarz tabeli dla `crux-doctor`: `rls: …; append_only: yes|no; retention: …`. */
export function tableComment(_tableName: string, opts: TableCommentOpts): string {
  return `rls: ${opts.rls}; append_only: ${opts.appendOnly ? "yes" : "no"}; retention: ${opts.retention}`;
}
