/**
 * Schemat Drizzle — eksport tabel modułów (K05+).
 * K04: tylko helpery kolumn / RLS; brak tabel domenowych → `db:generate` bez diffu.
 */
export { tenantColumns, mutableColumns } from "./columns.js";
export { rls, tableComment, type TableCommentOpts } from "./rls.js";
