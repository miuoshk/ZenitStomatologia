import { REQUEST_ID_HEADER } from "@crux/shared/request-id";
import { headers } from "next/headers";

/** `x-request-id` ustawiony przez `proxy.ts`; poza żądaniem → `undefined`. */
export async function getRequestId(): Promise<string | undefined> {
  try {
    const h = await headers();
    return h.get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
}
