import { describe, expect, it } from "vitest";
import {
  fail,
  httpStatusToCode,
  newRequestId,
  ok,
  parseEnvelope,
  redactSensitiveText,
  toApiError,
} from "./errors";

describe("httpStatusToCode", () => {
  it("maps known HTTP statuses", () => {
    expect(httpStatusToCode(400)).toBe("VALIDATION");
    expect(httpStatusToCode(401)).toBe("UNAUTHENTICATED");
    expect(httpStatusToCode(403)).toBe("UNAUTHORIZED");
    expect(httpStatusToCode(404)).toBe("NOT_FOUND");
    expect(httpStatusToCode(409)).toBe("CONFLICT");
    expect(httpStatusToCode(503)).toBe("UNAVAILABLE");
    expect(httpStatusToCode(408)).toBe("UNAVAILABLE");
    expect(httpStatusToCode(429)).toBe("UNAVAILABLE");
    expect(httpStatusToCode(500)).toBe("INTERNAL");
  });
});

describe("redactSensitiveText", () => {
  it("removes cancellation tokens and bearer values", () => {
    expect(
      redactSensitiveText("token cancellation_token=abc-123 failed"),
    ).toContain("[redacted]");
    expect(
      redactSensitiveText("Authorization Bearer eyJhbGciOi.xx"),
    ).not.toContain("eyJhbGciOi");
  });
});

describe("ok and fail", () => {
  it("wraps success and failure", () => {
    expect(ok({ id: 1 }, "r")).toEqual({
      ok: true,
      data: { id: 1 },
      requestId: "r",
    });
    expect(
      fail({
        code: "VALIDATION",
        message: "Dados inválidos.",
        requestId: "r",
      }).ok,
    ).toBe(false);
  });

  it("creates a request id", () => {
    expect(newRequestId()).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("parseEnvelope", () => {
  it("reads a success envelope", () => {
    const result = parseEnvelope<{ id: string }>(
      { ok: true, data: { id: "1" }, requestId: "req-1" },
      "fallback",
    );
    expect(result).toEqual({
      ok: true,
      data: { id: "1" },
      requestId: "req-1",
    });
  });

  it("reads a failure envelope and keeps IDEMPOTENT", () => {
    const result = parseEnvelope(
      {
        ok: false,
        error: {
          code: "IDEMPOTENT",
          message: "already done",
          requestId: "req-2",
        },
      },
      "fallback",
    );
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error.code).toBe("IDEMPOTENT");
      expect(result.error.requestId).toBe("req-2");
    }
  });

  it("returns undefined for a raw DTO", () => {
    expect(parseEnvelope({ slots: [] }, "fallback")).toBeUndefined();
  });
});

describe("toApiError", () => {
  it("prefers body code over HTTP status", () => {
    const error = toApiError({
      code: "IDEMPOTENT",
      status: 409,
      requestId: "r1",
    });
    expect(error.code).toBe("IDEMPOTENT");
  });

  it("uses the default message when the body is empty", () => {
    const error = toApiError({
      status: 400,
      message: "   ",
      requestId: "r2",
    });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("Dados inválidos.");
  });
});
