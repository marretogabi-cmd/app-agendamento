import { describe, expect, it } from "vitest";
import { DEFAULT_ERROR_MESSAGES } from "@/lib/api";
import { toPublicCancellationResult } from "./to-public-result";

const token = "11111111-2222-3333-4444-555555555555";

describe("toPublicCancellationResult", () => {
  it("leaves successful payloads unchanged", () => {
    const result = toPublicCancellationResult(
      {
        ok: true,
        data: { appointmentId: "apt-1" },
        requestId: "ok",
      },
      token,
    );

    expect(result).toEqual({
      ok: true,
      data: { appointmentId: "apt-1" },
      requestId: "ok",
    });
  });

  it("uses a uniform NOT_FOUND message without echoing the token", () => {
    const result = toPublicCancellationResult(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `cancellation_token=${token} inválido ou inexistente`,
          requestId: "err",
        },
      },
      token,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe(DEFAULT_ERROR_MESSAGES.NOT_FOUND);
      expect(result.error.message).not.toContain(token);
    }
  });

  it("redacts the token from other error messages", () => {
    const result = toPublicCancellationResult(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          message: `falhou para ${token}`,
          requestId: "err",
        },
      },
      token,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("falhou para [redacted]");
    }
  });

  it("still redacts cancellation_token= when the token value is unknown", () => {
    const result = toPublicCancellationResult(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          message: "cancellation_token=abc-123 failed",
          requestId: "err",
        },
      },
      "",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("[redacted]");
      expect(result.error.message).not.toContain("abc-123");
    }
  });
});
