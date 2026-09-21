import type { AuthError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { AUTH_ERROR_MESSAGE, mapAuthError } from "./map-auth-error";

function authError(message: string, status?: number): AuthError {
  return { message, status, name: "AuthError" } as AuthError;
}

describe("mapAuthError", () => {
  it("never echoes email or provider error text", () => {
    const result = mapAuthError(
      authError("Invalid login credentials for prestador@salao.com", 400),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(AUTH_ERROR_MESSAGE);
      expect(result.error.message).not.toContain("prestador@salao.com");
      expect(result.error.message).not.toContain("Invalid login");
    }
  });

  it("treats 400/422 as VALIDATION without changing the public message", () => {
    const invalid = mapAuthError(authError("User already registered", 422));
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION");
      expect(invalid.error.message).toBe(AUTH_ERROR_MESSAGE);
    }
  });

  it("treats other statuses as UNAUTHENTICATED", () => {
    const missing = mapAuthError(authError("Email not found", 401));
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("UNAUTHENTICATED");
      expect(missing.error.message).toBe(AUTH_ERROR_MESSAGE);
    }
  });
});
