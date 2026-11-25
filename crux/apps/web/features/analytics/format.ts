/** Grosze → złote (liczba do formatowania `pln`). */
export function zlote(grosze: number): number {
  return grosze / 100;
}

export function hoursFromMinutes(minutes: number): number {
  return minutes / 60;
}

/** Klucz koloru gabinetu → zmienna CSS `--dane-gabinet-0N` (01 zielony, 02 niebieski). */
export function locationColor(colorKey: string, index: number): string {
  const digits = /(\d+)/.exec(colorKey)?.[1];
  const n = digits ? Number(digits) : index + 1;
  const idx = Math.min(4, Math.max(1, Number.isFinite(n) ? n : index + 1));
  return `var(--dane-gabinet-0${String(idx)})`;
}
