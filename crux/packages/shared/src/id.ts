import { uuidv7 } from "uuidv7";
import { z } from "zod";

export const IdSchema = z.uuid().brand<"Id">();

/** Identyfikator domenowy (branded string, UUIDv7). */
export type Id = z.infer<typeof IdSchema>;

export function newId(): Id {
  return IdSchema.parse(uuidv7());
}

export function asId(value: string): Id {
  return IdSchema.parse(value);
}
