import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { REGISTER_ERROR_MESSAGE, registerWithPassword } from "./register";

const credentials = {
  email: "prestador@salao.com",
  password: "segredo-forte",
};

function createClient(result: unknown) {
  return {
    auth: { signUp: vi.fn().mockResolvedValue(result) },
  } as unknown as SupabaseClient;
}

describe("registerWithPassword", () => {
  it("returns an authenticated result when email confirmation is disabled", async () => {
    const session = { access_token: "jwt" } as Session;
    const client = createClient({
      data: { user: { id: "user-1" } as User, session },
      error: null,
    });

    const result = await registerWithPassword(client, credentials, {
      emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fagenda",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ status: "authenticated", session });
    }
    expect(client.auth.signUp).toHaveBeenCalledWith({
      ...credentials,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fagenda",
      },
    });
  });

  it("returns a neutral confirmation result when no session is created", async () => {
    const client = createClient({
      data: { user: { id: "user-1" } as User, session: null },
      error: null,
    });

    const result = await registerWithPassword(client, credentials, {
      emailRedirectTo: "http://localhost:3000/auth/callback",
    });

    expect(result).toEqual({
      ok: true,
      data: { status: "confirmation_required", session: null },
      requestId: expect.any(String),
    });
  });

  it("does not reveal whether the email already exists", async () => {
    const client = createClient({
      data: { user: null, session: null },
      error: {
        message: "User prestador@salao.com already registered",
        status: 422,
      } as AuthError,
    });

    const result = await registerWithPassword(client, credentials, {
      emailRedirectTo: "http://localhost:3000/auth/callback",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.message).toBe(REGISTER_ERROR_MESSAGE);
      expect(result.error.message).not.toContain("@");
    }
  });

  it("fails safely when Auth returns neither a user nor a session", async () => {
    const client = createClient({
      data: { user: null, session: null },
      error: null,
    });

    const result = await registerWithPassword(client, credentials, {
      emailRedirectTo: "http://localhost:3000/auth/callback",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTERNAL");
  });
});
