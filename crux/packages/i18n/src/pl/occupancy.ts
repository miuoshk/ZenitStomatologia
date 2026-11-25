/** Teksty ekranu obłożenia (F0-010). Bez danych pacjenta. */

export const OCCUPANCY_UI_CATEGORIES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"] as const;
export type OccupancyUiCategory = (typeof OCCUPANCY_UI_CATEGORIES)[number];

export const OCCUPANCY_CATEGORY_LABELS: Record<OccupancyUiCategory, string> = {
  Z1: "Z1",
  Z2: "Z2",
  Z3: "Z3",
  Z4: "Z4",
  Z5: "Z5",
  "Z+": "Z+",
};

export const OCCUPANCY_LABELS = {
  title: "Obłożenie",
  gridLabel: "Siatka obłożenia dnia: fotele w kolumnach, godziny w wierszach",
  hour: "Godzina",
  chair: "Fotel",
  today: "Dziś",
  prevDay: "Poprzedni dzień",
  nextDay: "Następny dzień",
  day: "Dzień",
  goToDay: "Przejdź",
  dayClosed: "Dzień zamknięty",
  dayClosedHint: "Edycja wymaga uprawnienia do zmian w zamkniętym dniu.",
  locationClosed: "Gabinet nieczynny w tym dniu",
  outsideHours: "Poza godzinami otwarcia",
  noChairs: "Ten gabinet nie ma aktywnych foteli.",
  blocked: "Blokada",
  empty: "Wolne",
  editorTitle: "Wpis obłożenia",
  editorRange: "Zakres godzin",
  fromHour: "Od godziny",
  toHour: "Do godziny",
  category: "Kategoria",
  amount: "Kwota (zł)",
  amountHint: "np. 450 lub 450,00 — puste = bez kwoty",
  note: "Notatka (bez danych pacjenta)",
  overrideReason: "Powód wpisu poza godzinami otwarcia",
  save: "Zapisz",
  saving: "Zapisywanie…",
  cancel: "Anuluj",
  voidEntry: "Anuluj wpis",
  voidReason: "Powód anulowania",
  voidConfirm: "Anuluj wpis",
  copyDay: "Dzień jak…",
  copyFrom: "Skopiuj z dnia",
  copyConfirm: "Kopiuj",
  closeDay: "Zamknij dzień",
  reopenDay: "Otwórz ponownie",
  reopenReason: "Powód ponownego otwarcia",
  closeSummary: "Zamknięto dzień.",
  keyboardHelp:
    "Strzałki — ruch, Enter — edycja, 1–6 — kategoria Z1–Z+, Shift+strzałka — zakres, Backspace — anuluj wpis, Esc — zamknij edytor.",
  saved: "Zapisano.",
  voided: "Wpis anulowany.",
  copied: (copied: number, skipped: number) =>
    `Skopiowano ${String(copied)} wpisów, pominięto ${String(skipped)}.`,
  summary: (hours: number, amount: string) => `Godzin: ${String(hours)}, kwota: ${amount}`,
  readOnly: "Podgląd — brak uprawnień do edycji.",
  appointmentsMode: "Obłożenie wynika z wizyt — ręczne wpisy są wyłączone.",
  error: "Nie udało się wykonać operacji.",
  invalidAmount: "Nieprawidłowa kwota.",
  invalidRange: "Zakres godzin jest nieprawidłowy.",
  weekTitle: "Obłożenie — tydzień",
  weekNav: "Tydzień",
  prevWeek: "Poprzedni tydzień",
  nextWeek: "Następny tydzień",
  dayView: "Widok dnia",
  weekView: "Widok tygodnia",
  weekCalendar: "Obłożenie w tygodniu",
  weekTable: "Sumy obłożenia w tygodniu",
  hoursCol: "Godziny",
  amountCol: "Kwota",
  statusCol: "Status",
} as const;

export const OCCUPANCY_ERROR_CODES_PL: Record<string, string> = {
  invalid_hour: "Godzina musi być liczbą całkowitą od 0 do 23.",
  nonexistent_hour: "Ta godzina nie istnieje w tym dniu (zmiana czasu).",
  invalid_category: "Nieprawidłowa kategoria. Dozwolone: Z1, Z2, Z3, Z4, Z5, Z+.",
  invalid_amount: "Kwota nie może być ujemna.",
  note_too_long: "Notatka może mieć najwyżej 80 znaków.",
  note_contains_pii: "Notatka nie może zawierać danych pacjenta.",
  outside_opening_hours: "Godzina poza godzinami otwarcia gabinetu.",
  override_reason_required: "Podaj powód wpisu poza godzinami otwarcia.",
  chair_blocked: "Fotel jest zablokowany w tym czasie.",
  chair_occupied: "Ta godzina na fotelu ma już wpis. Zmień godzinę lub popraw istniejący wpis.",
  reason_required: "Podaj powód.",
  already_voided: "Wpis jest już anulowany.",
  day_closed: "Dzień zamknięty. Poproś kierownika.",
  not_own_entry: "Możesz anulować tylko własne wpisy.",
  entry_not_editable: "Nie możesz zmienić tego wpisu.",
  day_already_closed: "Dzień jest już zamknięty.",
  day_not_closed: "Dzień nie jest zamknięty.",
  invalid_range: "Zakres godzin jest nieprawidłowy.",
  occupancy_mode_appointments:
    "Obłożenie liczy się z terminarza. Ręczne wpisy są wyłączone.",
};

/** Komunikat dla `details.code` błędu walidacji obłożenia; `undefined` → ogólny. */
export function occupancyErrorMessage(code: string | undefined): string | undefined {
  return code ? OCCUPANCY_ERROR_CODES_PL[code] : undefined;
}

/** Grosze (string/bigint) → „450,00 zł”. */
export function formatGrosze(grosze: string | bigint): string {
  const n = typeof grosze === "bigint" ? grosze : BigInt(grosze);
  const zl = n / 100n;
  const gr = (n % 100n).toString().padStart(2, "0");
  const zlStr = zl.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `${zlStr},${gr}\u00a0zł`;
}

/** „450”, „450,5”, „450.50” → grosze jako string; pusty → null; błąd → undefined. */
export function parseZlotyToGrosze(input: string): string | null | undefined {
  const t = input.trim().replace(/\s/g, "");
  if (t === "") return null;
  const m = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(t);
  if (!m) return undefined;
  const frac = (m[2] ?? "").padEnd(2, "0");
  return (BigInt(m[1] ?? "0") * 100n + BigInt(frac || "0")).toString();
}
