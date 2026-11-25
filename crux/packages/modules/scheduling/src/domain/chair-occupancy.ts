import { err, ok, type DomainError, type Result } from "@crux/shared/result";
import { newId } from "@crux/shared/id";
import { containsPii } from "@crux/shared/pii";
import { hourRange, type Clock, type PlainDate } from "@crux/shared/time";

/** Kategorie obłożenia (F0-010). Brak pól identyfikujących pacjenta. */
export const OCCUPANCY_CATEGORIES = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z+"] as const;
export type OccupancyCategory = (typeof OCCUPANCY_CATEGORIES)[number];

export const NOTE_MAX_LENGTH = 80;

export type OccupancySource = "manual" | "appointment" | "import";

/** Kody błędów walidacji → komunikaty po polsku (interfejs). */
export const OCCUPANCY_MESSAGES_PL = {
  invalid_hour: "Godzina musi być liczbą całkowitą od 0 do 23.",
  nonexistent_hour: "Ta godzina nie istnieje w tym dniu (zmiana czasu).",
  invalid_category: "Nieprawidłowa kategoria. Dozwolone: Z1, Z2, Z3, Z4, Z5, Z+.",
  invalid_amount: "Kwota nie może być ujemna.",
  note_too_long: "Notatka może mieć najwyżej 80 znaków.",
  note_contains_pii: "Notatka nie może zawierać danych osobowych (telefon, PESEL, e-mail).",
  outside_opening_hours: "Godzina poza godzinami otwarcia gabinetu.",
  override_reason_required: "Podaj powód wpisu poza godzinami otwarcia.",
  chair_blocked: "Fotel jest zablokowany w tym czasie.",
  reason_required: "Podaj powód.",
  already_voided: "Wpis jest już anulowany.",
  day_closed: "Dzień jest zamknięty. Edycja wymaga uprawnienia do zmian w zamkniętym dniu.",
  occupancy_mode_appointments:
    "Obłożenie wynika z wizyt (tryb „wizyty”). Ręczne wpisy są wyłączone.",
  chair_not_found: "Nie znaleziono fotela w tym gabinecie.",
  entry_not_found: "Nie znaleziono wpisu.",
  day_already_closed: "Dzień jest już zamknięty.",
  day_not_closed: "Dzień nie jest zamknięty.",
  chair_or_staff_required: "Wskaż fotel lub osobę, której dotyczy blokada.",
  invalid_range: "Nieprawidłowy zakres godzin.",
  overlaps_entries: "W tym czasie na fotelu są już wpisy obłożenia.",
  chair_occupied: "Ta godzina na fotelu jest już zajęta.",
  schema: "Nieprawidłowe dane wejściowe.",
} as const;

export type OccupancyErrorCode = keyof typeof OCCUPANCY_MESSAGES_PL;

export function occupancyMessagePl(code: string | undefined): string {
  if (code && code in OCCUPANCY_MESSAGES_PL) {
    return OCCUPANCY_MESSAGES_PL[code as OccupancyErrorCode];
  }
  return "Nie udało się wykonać operacji.";
}

function invalid(field: string, code: OccupancyErrorCode): DomainError {
  return { type: "validation", details: { field, code } };
}

export type OccupancyContext = {
  /** `occupancy.override_hours` */
  readonly canOverrideHours: boolean;
  isWithinOpeningHours(day: PlainDate, hour: number): boolean;
  /** `period` w formacie tstzrange `[a,b)`. */
  isBlocked(chairId: string, period: string): boolean;
};

export type OccupancyEntryInput = {
  readonly tenantId: string;
  readonly locationId: string;
  readonly chairId: string;
  readonly providerId?: string | null;
  readonly day: PlainDate;
  readonly hour: number;
  readonly category: string;
  readonly amountGrosze?: bigint | null;
  readonly note?: string | null;
  readonly overrideReason?: string | null;
  readonly source?: OccupancySource;
  readonly createdBy?: string | null;
};

export type OccupancyEntryData = {
  readonly id: string;
  readonly tenantId: string;
  readonly locationId: string;
  readonly chairId: string;
  readonly providerId: string | null;
  readonly day: PlainDate;
  readonly hour: number;
  readonly period: string;
  readonly category: OccupancyCategory;
  readonly amountGrosze: bigint | null;
  readonly source: OccupancySource;
  readonly overrideReason: string | null;
  readonly note: string | null;
  readonly voidedAt: Date | null;
  readonly voidedBy: string | null;
  readonly voidReason: string | null;
  readonly createdAt: Date;
  readonly createdBy: string | null;
};

function isCategory(value: string): value is OccupancyCategory {
  return (OCCUPANCY_CATEGORIES as readonly string[]).includes(value);
}

/** Zakres `[a,b)` jest pusty (godzina nie istnieje przy zmianie czasu na letni). */
function isEmptyRange(period: string): boolean {
  const inner = period.slice(1, -1);
  const [a, b] = inner.split(",");
  return a === b;
}

export function validateNote(note: string | null | undefined): Result<string | null, DomainError> {
  if (note === null || note === undefined) return ok(null);
  const trimmed = note.trim();
  if (trimmed === "") return ok(null);
  if (trimmed.length > NOTE_MAX_LENGTH) return err(invalid("note", "note_too_long"));
  if (containsPii(trimmed)) return err(invalid("note", "note_contains_pii")); // [F0-010/AC7]
  return ok(trimmed);
}

export const OccupancyEntry = {
  create(
    input: OccupancyEntryInput,
    clock: Clock,
    context: OccupancyContext,
  ): Result<OccupancyEntryData, DomainError> {
    if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
      return err(invalid("hour", "invalid_hour"));
    }
    if (!isCategory(input.category)) {
      return err(invalid("category", "invalid_category"));
    }
    const amount = input.amountGrosze ?? null;
    if (amount !== null && amount < 0n) {
      return err(invalid("amountGrosze", "invalid_amount"));
    }
    const note = validateNote(input.note);
    if (!note.ok) return note;

    const period = hourRange(input.day, input.hour);
    if (isEmptyRange(period)) {
      return err(invalid("hour", "nonexistent_hour"));
    }

    let overrideReason: string | null = null;
    if (!context.isWithinOpeningHours(input.day, input.hour)) {
      // [F0-010/AC3] poza godzinami otwarcia — tylko z uprawnieniem i powodem
      if (!context.canOverrideHours) {
        return err({ type: "forbidden", details: { reason: "occupancy.override_hours" } });
      }
      const reason = input.overrideReason?.trim() ?? "";
      if (reason === "") return err(invalid("overrideReason", "override_reason_required"));
      overrideReason = reason;
    }

    if (context.isBlocked(input.chairId, period)) {
      return err(invalid("chairId", "chair_blocked"));
    }

    return ok({
      id: newId(),
      tenantId: input.tenantId,
      locationId: input.locationId,
      chairId: input.chairId,
      providerId: input.providerId ?? null,
      day: input.day,
      hour: input.hour,
      period,
      category: input.category,
      amountGrosze: amount,
      source: input.source ?? "manual",
      overrideReason,
      note: note.value,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      createdAt: clock.now(),
      createdBy: input.createdBy ?? null,
    });
  },

  /** Anulowanie (soft-void). Powód wymagany; brak fizycznego kasowania. */
  void<T extends { readonly voidedAt: Date | null }>(
    entry: T,
    reason: string,
    clock: Clock,
    voidedBy: string | null = null,
  ): Result<T & { voidedAt: Date; voidedBy: string | null; voidReason: string }, DomainError> {
    const trimmed = reason.trim();
    if (trimmed === "") return err(invalid("reason", "reason_required"));
    if (entry.voidedAt !== null) return err(invalid("entry", "already_voided"));
    return ok({ ...entry, voidedAt: clock.now(), voidedBy, voidReason: trimmed });
  },
};

export type OccupancyEntry = OccupancyEntryData;

/** Czy godzina `hour` mieści się w oknie otwarcia (`HH:MM[:SS]`). */
export function isHourWithinWindow(
  window: { closed: boolean; opens: string | null; closes: string | null },
  hour: number,
): boolean {
  if (window.closed || !window.opens || !window.closes) return false;
  const opens = toMinutes(window.opens);
  const closes = toMinutes(window.closes);
  return hour * 60 >= opens && (hour + 1) * 60 <= closes;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

export type DaySummary = {
  hours: number;
  amount_grosze: number;
  chairs_without_entries: string[];
};

export type DayClosureState = {
  readonly closedAt: Date | null;
  readonly reopenedAt: Date | null;
};

/** Dzień jest zamknięty, gdy istnieje zamknięcie bez późniejszego otwarcia. */
export function isDayClosed(closure: DayClosureState | null | undefined): boolean {
  return !!closure && closure.closedAt !== null && closure.reopenedAt === null;
}

export const DayClosure = {
  /** Podsumowanie dnia z aktywnych (nieanulowanych) wpisów. */
  close(
    _locationId: string,
    _day: PlainDate,
    entries: ReadonlyArray<{
      readonly chairId: string;
      readonly amountGrosze: bigint | null;
      readonly voidedAt?: Date | null;
    }>,
    chairs: ReadonlyArray<{ readonly id: string }>,
  ): DaySummary {
    const active = entries.filter((e) => !e.voidedAt);
    const withEntries = new Set(active.map((e) => e.chairId));
    let amount = 0n;
    for (const e of active) amount += e.amountGrosze ?? 0n;
    return {
      hours: active.length,
      amount_grosze: Number(amount),
      chairs_without_entries: chairs.filter((c) => !withEntries.has(c.id)).map((c) => c.id),
    };
  },
};
