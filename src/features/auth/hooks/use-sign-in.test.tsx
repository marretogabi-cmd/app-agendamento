/** @vitest-environment jsdom */

import type { Session } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ERROR_MESSAGE } from "../api/map-auth-error";
import { useSignIn } from "./use-sign-in";

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/sign-in", () => ({
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
  signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
}));

describe("useSignIn", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signInWithOAuth.mockReset();
  });

  it("exposes a successful password session", async () => {
    const session = { access_token: "jwt" } as Session;
    signInWithPassword.mockResolvedValue({
      ok: true,
      data: session,
      requestId: "ok",
    });

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signInWithPassword({
        email: "prestador@salao.com",
        password: "secret",
      });
    });

    expect(result.current.password.status).toBe("success");
    expect(result.current.password.data?.access_token).toBe("jwt");
  });

  it("keeps a generic error when login fails", async () => {
    signInWithPassword.mockResolvedValue({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: AUTH_ERROR_MESSAGE,
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signInWithPassword({
        email: "prestador@salao.com",
        password: "secret",
      });
    });

    expect(result.current.password.status).toBe("error");
    expect(result.current.password.error?.message).toBe(AUTH_ERROR_MESSAGE);
    expect(result.current.password.error?.message).not.toContain("@");
  });

  it("starts OAuth without exposing provider error text", async () => {
    signInWithOAuth.mockResolvedValue({
      ok: true,
      data: { url: "https://oauth.example/start" },
      requestId: "ok",
    });

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signInWithOAuth("google");
    });

    expect(result.current.oauth.status).toBe("success");
    expect(result.current.oauth.data?.url).toBe("https://oauth.example/start");
  });
});
