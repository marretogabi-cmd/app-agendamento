import type { AuthError, Session, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { refreshSession } from "./refresh-session";

function createClient(result: unknown) {
  return {
    auth: { refreshSession: vi.fn().mockResolvedValue(result) },
  } as unknown as SupabaseClient;
}

describe("refreshSession", () => {
  it("returns the renewed session", async () => {
    const session = { access_token: "new-jwt" } as Session;
    const result = await refreshSession(
      createClient({ data: { session, user: session.user }, error: null }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.access_token).toBe("new-jwt");
  });

  it("maps an invalid refresh token to UNAUTHENTICATED", async () => {
    const result = await refreshSession(
      createClient({
        data: { session: null, user: null },
        error: { message: "Invalid refresh token", status: 400 } as AuthError,
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
      expect(result.error.message).not.toContain("token");
    }
  });

  it("fails when Auth returns no session", async () => {
    const result = await refreshSession(
      createClient({ data: { session: null, user: null }, error: null }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });
});
