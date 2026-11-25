export type NumFormat = "int" | "dec1" | "dec2" | "pln" | "pct";

const cache = new Map<string, Intl.NumberFormat>();

function fmt(key: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pl-PL", opts);
    cache.set(key, f);
  }
  return f;
}

export function formatNumber(value: number, format: NumFormat = "int"): string {
  switch (format) {
    case "dec1":
      return fmt("dec1", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    case "dec2":
      return fmt("dec2", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    case "pln":
      return fmt("pln", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(value);
    case "pct":
      return fmt("pct", { style: "percent", maximumFractionDigits: 0 }).format(value);
    default:
      return fmt("int", { maximumFractionDigits: 0 }).format(value);
  }
}

export function formatDatePl(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatTimePl(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTimePl(date: Date): string {
  return `${formatDatePl(date)}, ${formatTimePl(date)}`;
}

export function peselValid(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(pesel[i]) * (w[i] ?? 0);
  return (10 - (sum % 10)) % 10 === Number(pesel[10]);
}

export function formatPhonePl(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
