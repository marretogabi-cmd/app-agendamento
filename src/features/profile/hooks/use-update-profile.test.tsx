/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateProfile } from "./use-update-profile";

const updateProfile = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/update-profile", () => ({
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

const profileDto = {
  id: "profile-1",
  name: "Luciane",
  publicSlug: "luciane-nails",
  phone: "11999999999",
  updatedAt: "2026-09-14T12:00:00.000Z",
};

describe("useUpdateProfile", () => {
  beforeEach(() => {
    updateProfile.mockReset();
  });

  it("exposes the updated profile after PATCH", async () => {
    updateProfile.mockResolvedValue({
      ok: true,
      data: profileDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useUpdateProfile());
    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.update({ publicSlug: "luciane-nails" });
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(profileDto);
    expect(result.current.isConflict).toBe(false);
  });

  it("exposes isConflict when the public slug is taken", async () => {
    updateProfile.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível. Atualize a agenda.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useUpdateProfile());

    await act(async () => {
      await result.current.update({ publicSlug: "slug-em-uso" });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isConflict).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
