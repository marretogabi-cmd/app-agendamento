/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignOut } from "./use-sign-out";

const signOutApi = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/sign-out", () => ({
  signOut: (...args: unknown[]) => signOutApi(...args),
}));

describe("useSignOut", () => {
  beforeEach(() => {
    signOutApi.mockReset();
  });

  it("marks success after Auth signs out", async () => {
    signOutApi.mockResolvedValue({
      ok: true,
      data: { signedOut: true },
      requestId: "ok",
    });

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe("success");
  });
});
