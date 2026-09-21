import { describe, expect, it } from "vitest";
import { DEFAULT_ERROR_MESSAGES } from "@/lib/api";
import { toPublicProviderCancelResult } from "./to-public-result";

describe("toPublicProviderCancelResult", () => {
  it("leaves successful payloads unchanged", () => {
    const result = toPublicProviderCancelResult({
      ok: true,
      data: { appointmentId: "apt-1", status: "CANCELLED" },
      requestId: "ok",
    });

    expect(result).toEqual({
      ok: true,
      data: { appointmentId: "apt-1", status: "CANCELLED" },
      requestId: "ok",
    });
  });

  it("uses uniform messages for NOT_FOUND and UNAUTHORIZED", () => {
    const missing = toPublicProviderCancelResult({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "appointment of another provider",
        requestId: "err",
      },
    });
    const forbidden = toPublicProviderCancelResult({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "not the owner of apt-1",
        requestId: "err",
      },
    });

    expect(missing.ok).toBe(false);
    expect(forbidden.ok).toBe(false);
    if (!missing.ok && !forbidden.ok) {
      expect(missing.error.message).toBe(DEFAULT_ERROR_MESSAGES.NOT_FOUND);
      expect(forbidden.error.message).toBe(DEFAULT_ERROR_MESSAGES.UNAUTHORIZED);
      expect(missing.error.message).not.toMatch(/another|owner|seu/i);
      expect(forbidden.error.message).not.toMatch(/another|owner|seu/i);
    }
  });

  it("redacts cancellation tokens from other errors", () => {
    const result = toPublicProviderCancelResult({
      ok: false,
      error: {
        code: "INTERNAL",
        message: "cancellation_token=secret-token failed",
        requestId: "err",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("[redacted]");
      expect(result.error.message).not.toContain("secret-token");
    }
  });
});
