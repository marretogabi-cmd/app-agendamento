import type { AuthError, Session, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AUTH_ERROR_MESSAGE } from "./map-auth-error";
import { signInWithOAuth, signInWithPassword } from "./sign-in";

const session = { access_token: "jwt", user: { id: "user-1" } } as Session;

function createClient(overrides: {
  signInWithPassword?: ReturnType<typeof vi.fn>;
  signInWithOAuth?: ReturnType<typeof vi.fn>;
}) {
  return {
    auth: {
      signInWithPassword:
        overrides.signInWithPassword ??
        vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithOAuth:
        overrides.signInWithOAuth ??
        vi.fn().mockResolvedValue({
          data: { url: "https://oauth.example/start" },
          error: null,
        }),
    },
  } as unknown as SupabaseClient;
}

describe("signInWithPassword", () => {
  it("returns the session on success", async () => {
    const client = createClient({});
    const result = await signInWithPassword(client, {
      email: "prestador@salao.com",
      password: "secret",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.access_token).toBe("jwt");
    }
  });

  it("hides whether the email exists", async () => {
    const client = createClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: {
          message: "Email not found: prestador@salao.com",
          status: 400,
        } as AuthError,
      }),
    });

    const result = await signInWithPassword(client, {
      email: "prestador@salao.com",
      password: "secret",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(AUTH_ERROR_MESSAGE);
      expect(result.error.message).not.toContain("@");
    }
  });

  it("fails when Auth returns no session", async () => {
    const client = createClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    });

    const result = await signInWithPassword(client, {
      email: "prestador@salao.com",
      password: "secret",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });
});

describe("signInWithOAuth", () => {
  it("returns the provider url", async () => {
    const client = createClient({});
    const result = await signInWithOAuth(client, {
      provider: "google",
      redirectTo: "http://localhost:3000",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toContain("https://oauth.example/start");
    }
  });

  it("maps provider errors without leaking details", async () => {
    const client = createClient({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: null },
        error: {
          message: "oauth failed for prestador@salao.com",
          status: 401,
        } as AuthError,
      }),
    });

    const result = await signInWithOAuth(client, {
      provider: "google",
      redirectTo: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(AUTH_ERROR_MESSAGE);
    }
  });

  it("fails when the provider omits a url", async () => {
    const client = createClient({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: null },
        error: null,
      }),
    });

    const result = await signInWithOAuth(client, {
      provider: "github",
      redirectTo: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
    }
  });
});
