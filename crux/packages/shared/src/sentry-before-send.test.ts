import { describe, expect, it } from "vitest";
import { scrubSentryEvent, sentryBaseOptions } from "./sentry-before-send";

describe("scrubSentryEvent", () => {
  it("usuwa dane żądania, nagłówki, cookies i ogranicza user do id", () => {
    const out = scrubSentryEvent({
      request: {
        url: "https://x.pl/a?pesel=1",
        data: { name: "Jan" },
        cookies: { a: "b" },
        headers: { cookie: "s" },
        query_string: "q=1",
      },
      user: { id: "u1", email: "a@b.pl", ip_address: "1.2.3.4", username: "jan" },
      extra: { note: "x" },
      exception: { values: [{ value: "błąd dla jan@example.com", vars: { a: 1 } }] },
      breadcrumbs: [{ message: "ok", data: { body: "x" } }],
    });
    const json = JSON.stringify(out);
    expect(out.user).toEqual({ id: "u1" });
    expect(out.request).toEqual({ url: "https://x.pl/a" });
    expect(json).not.toContain("jan@example.com");
    expect(json).not.toContain("Jan");
    expect(json).not.toContain("extra");
    expect(json).not.toContain("body");
  });

  it("usuwa user bez id", () => {
    expect(scrubSentryEvent({ user: { email: "a@b.pl" } })).not.toHaveProperty("user");
  });
});

describe("sentryBaseOptions", () => {
  it("pusty DSN → undefined; sendDefaultPii=false; domyślne środowisko local", () => {
    const o = sentryBaseOptions({ SENTRY_DSN: " " });
    expect(o.dsn).toBeUndefined();
    expect(o.sendDefaultPii).toBe(false);
    expect(o.environment).toBe("local");
    expect(
      sentryBaseOptions({
        SENTRY_DSN: "https://k@o.ingest.de.sentry.io/1",
        SENTRY_ENVIRONMENT: "staging",
      }),
    ).toMatchObject({ environment: "staging" });
  });
});
