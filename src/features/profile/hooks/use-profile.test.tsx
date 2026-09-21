/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfile } from "./use-profile";

const getProfile = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/get-profile", () => ({
  getProfile: (...args: unknown[]) => getProfile(...args),
}));

const profileDto = {
  id: "profile-1",
  name: "Luciane",
  publicSlug: "luciane-nails",
  phone: "11999999999",
  updatedAt: "2026-09-14T12:00:00.000Z",
};

describe("useProfile", () => {
  beforeEach(() => {
    getProfile.mockReset();
  });

  it("loads the public profile DTO", async () => {
    getProfile.mockResolvedValue({
      ok: true,
      data: profileDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual(profileDto);
    expect(result.current.data).not.toHaveProperty("email");
  });

  it("exposes UNAUTHENTICATED when the session is missing", async () => {
    getProfile.mockResolvedValue({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Sessão expirada ou ausente.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error?.code).toBe("UNAUTHENTICATED");
  });
});
