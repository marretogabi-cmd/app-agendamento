/** @vitest-environment jsdom */

import type { Session } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRegister } from "./use-register";

const registerWithPassword = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/register", () => ({
  registerWithPassword: (...args: unknown[]) => registerWithPassword(...args),
}));

vi.mock("../api/sign-in", () => ({
  signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
}));

describe("useRegister", () => {
  beforeEach(() => {
    registerWithPassword.mockReset();
    signInWithOAuth.mockReset();
  });

  it("exposes an authenticated password registration", async () => {
    const session = { access_token: "jwt" } as Session;
    registerWithPassword.mockResolvedValue({
      ok: true,
      data: { status: "authenticated", session },
      requestId: "ok",
    });

    const { result } = renderHook(() => useRegister("/agenda"));

    await act(async () => {
      await result.current.registerWithPassword({
        email: "prestador@salao.com",
        password: "segredo-forte",
      });
    });

    expect(result.current.password.status).toBe("success");
    expect(registerWithPassword).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ email: "prestador@salao.com" }),
      {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fagenda",
      },
    );
  });

  it("starts Google registration through the OAuth callback", async () => {
    signInWithOAuth.mockResolvedValue({
      ok: true,
      data: { url: "https://oauth.example/start" },
      requestId: "ok",
    });

    const { result } = renderHook(() => useRegister("/agenda"));

    await act(async () => {
      await result.current.registerWithOAuth("google");
    });

    expect(result.current.oauth.status).toBe("success");
    expect(signInWithOAuth).toHaveBeenCalledWith(
      {},
      {
        provider: "google",
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fagenda",
      },
    );
  });
});
