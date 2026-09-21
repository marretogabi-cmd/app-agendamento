import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshSession, signOut } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GET as authCallback } from "./auth/callback/route";
import { POST as refresh } from "./refresh/route";
import * as refreshRoute from "./refresh/route";
import { POST as signOutRequest } from "./sign-out/route";
import * as signOutRoute from "./sign-out/route";

vi.mock("@/features/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth")>();
  return {
    ...actual,
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock("@/lib/env/public", () => ({ hasPublicEnv: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("Auth route handlers", () => {
  beforeEach(() => {
    vi.mocked(hasPublicEnv).mockReset();
    vi.mocked(hasPublicEnv).mockReturnValue(true);
    vi.mocked(createServerSupabaseClient).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({} as never);
    vi.mocked(signOut).mockReset();
    vi.mocked(refreshSession).mockReset();
  });

  it("signs out locally through POST and redirects with 303", async () => {
    vi.mocked(signOut).mockResolvedValue({
      ok: true,
      data: { signedOut: true },
      requestId: "ok",
    });

    const response = await signOutRequest(
      new NextRequest("http://localhost:3000/sign-out", { method: "POST" }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(signOut).toHaveBeenCalled();
    expect("GET" in signOutRoute).toBe(false);
  });

  it("refreshes cookie state and redirects to a safe next path", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      ok: true,
      data: { access_token: "new-jwt" } as never,
      requestId: "ok",
    });

    const response = await refresh(
      new NextRequest("http://localhost:3000/refresh?next=%2Fagenda", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/agenda",
    );
    expect("GET" in refreshRoute).toBe(false);
  });

  it("rejects an external refresh destination", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      ok: true,
      data: { access_token: "new-jwt" } as never,
      requestId: "ok",
    });

    const response = await refresh(
      new NextRequest(
        "http://localhost:3000/refresh?next=https%3A%2F%2Fevil.example",
        { method: "POST" },
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("returns an expired session to sign-in without exposing tokens", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Não foi possível renovar a sessão.",
        requestId: "err",
      },
    });

    const response = await refresh(
      new NextRequest("http://localhost:3000/refresh?next=%2Fagenda", {
        method: "POST",
      }),
    );

    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/sign-in?error=session_expired");
    expect(location).toContain("next=%2Fagenda");
    expect(location).not.toContain("token");
  });

  it("exchanges an OAuth code and redirects to next", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as never);

    const response = await authCallback(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=one-time-code&sb_flow_id=flow-1&next=%2Fagenda",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code", {
      flowId: "flow-1",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/agenda",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("handles missing OAuth codes and missing env without throwing", async () => {
    const missingCode = await authCallback(
      new NextRequest("http://localhost:3000/auth/callback?next=%2Fagenda"),
    );
    expect(missingCode.headers.get("location")).toContain(
      "error=oauth_callback",
    );

    vi.mocked(hasPublicEnv).mockReturnValue(false);
    const unavailable = await refresh(
      new NextRequest("http://localhost:3000/refresh", { method: "POST" }),
    );
    expect(unavailable.headers.get("location")).toContain("error=unavailable");
  });
});
