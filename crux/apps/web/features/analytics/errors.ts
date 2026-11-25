/** Błąd karty pulpitu: renderowany jako karta z komunikatem, reszta strony działa. */
export class CardError extends Error {
  readonly kind: "forbidden" | "failed";
  constructor(kind: "forbidden" | "failed") {
    super(kind);
    this.name = "CardError";
    this.kind = kind;
  }
}
