import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { signOut } from "./sign-out";

describe("signOut", () => {
  it("confirms a successful logout", async () => {
    const client = {
      auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    } as unknown as SupabaseClient;

    const result = await signOut(client);
    expect(result).toEqual({
      ok: true,
      data: { signedOut: true },
      requestId: expect.any(String),
    });
  });

  it("returns INTERNAL without session details", async () => {
    const client = {
      auth: {
        signOut: vi.fn().mockResolvedValue({
          error: { message: "jwt eyJhbGciOi.xx", status: 500 } as AuthError,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await signOut(client);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).not.toContain("eyJ");
    }
  });
});
