/** Budowa CSV (Excel PL): separator `;`, przecinek dziesiętny, BOM UTF-8, ochrona przed formułami. */
const BOM = "\uFEFF";

export type CsvCell = string | number | null;

function cell(value: CsvCell): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value).replace(".", ",");
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [header.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))];
  return `${BOM}${lines.join("\r\n")}\r\n`;
}
