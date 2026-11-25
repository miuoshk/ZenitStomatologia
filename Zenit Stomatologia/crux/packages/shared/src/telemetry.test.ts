import { describe, expect, it } from "vitest";
import { otelEnabled, startSpan } from "./telemetry";

describe("telemetry", () => {
  it("startSpan działa jako no-op bez SDK i przekazuje wynik / błąd", async () => {
    await expect(startSpan("x", { "crux.module": "m" }, () => Promise.resolve(5))).resolves.toBe(5);
    await expect(startSpan("x", {}, () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
  });
  it("otelEnabled tylko przy ustawionym endpoincie", () => {
    expect(otelEnabled({})).toBe(false);
    expect(otelEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: " " })).toBe(false);
    expect(otelEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://x:4318" })).toBe(true);
  });
});
