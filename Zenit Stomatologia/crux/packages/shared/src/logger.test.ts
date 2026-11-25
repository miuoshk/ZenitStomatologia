import { describe, expect, it } from "vitest";
import { createLogger, sanitizeLogObject } from "./logger";
import { generateTestPesel } from "./pesel";

function capture(extra?: readonly string[]) {
  const lines: Record<string, unknown>[] = [];
  const destination = {
    write(chunk: string) {
      lines.push(JSON.parse(chunk) as Record<string, unknown>);
    },
  };
  const logger = createLogger({
    name: "test",
    level: "debug",
    destination,
    ...(extra ? { extraAllowedKeys: extra } : {}),
  });
  return { logger, lines };
}

describe("createLogger", () => {
  it("zostawia tylko klucze z allowlisty i emituje ostrzeżenie logger.redacted", () => {
    const { logger, lines } = capture();
    logger.info(
      {
        pesel: generateTestPesel({ birthDate: "1990-01-15", sex: "female" }),
        lastName: "Kowalski",
        phone: "+48 600100200",
        content: "notatka",
        tenantId: "t-1",
        requestId: "r-1",
      },
      "zdarzenie",
    );
    const main = lines[0] as Record<string, unknown>;
    expect(main["tenantId"]).toBe("t-1");
    expect(main["requestId"]).toBe("r-1");
    for (const k of ["pesel", "lastName", "phone", "content"]) {
      expect(main).not.toHaveProperty(k);
    }
    const warn = lines[1] as Record<string, unknown>;
    expect(warn["msg"]).toBe("logger.redacted");
    expect(warn["redactedCount"]).toBe(4);
    expect(JSON.stringify(lines)).not.toContain("Kowalski");
  });

  it("redaguje PII w wartościach dozwolonych kluczy bez ujawniania wartości", () => {
    const { logger, lines } = capture();
    logger.info({ module: "jan@example.com", usecase: "ok" }, "x");
    const main = lines[0] as Record<string, unknown>;
    expect(main["module"]).toBe("[REDACTED]");
    expect(main["usecase"]).toBe("ok");
    expect(lines[1]?.["msg"]).toBe("logger.redacted");
    expect(JSON.stringify(lines)).not.toContain("example.com");
  });

  it("dopuszcza klucze *Id i scrubuje zagnieżdżone obiekty", () => {
    const { logger, lines } = capture();
    logger.info({ outboxId: "o1", nested: { requestId: "r", name: "x", secret: 1 } }, "m");
    const main = lines[0] as Record<string, unknown>;
    expect(main["outboxId"]).toBe("o1");
    expect(main).not.toHaveProperty("nested");
    const out = sanitizeLogObject({ meta: { requestId: "r", pesel: "x" } }, ["meta"]);
    expect(out.value).toEqual({ meta: { requestId: "r" } });
    expect(out.redactedCount).toBe(1);
  });

  it("err: tylko type i message, bez stosu", () => {
    const { logger, lines } = capture();
    logger.error({ err: new TypeError("boom") }, "fail");
    const main = lines[0] as { err: Record<string, unknown> };
    expect(main.err).toEqual({ type: "TypeError", message: "boom" });
    expect(lines).toHaveLength(1);
  });

  it("Error jako pierwszy argument i PII w msg", () => {
    const { logger, lines } = capture();
    logger.error(new Error("zły numer 600100200"));
    const main = lines[0] as { err: { message: string }; msg: string };
    expect(main.err.message).toBe("[REDACTED]");
    expect(main.msg).toBe("[REDACTED]");
  });

  it("extraAllowedKeys przepuszcza klucze operacyjne", () => {
    const { logger, lines } = capture(["operation"]);
    logger.info({ operation: "worker" }, "ok");
    expect(lines[0]?.["operation"]).toBe("worker");
    expect(lines).toHaveLength(1);
  });
});
