/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { successAvailabilityFixture } from "@/lib/api";
import type { AvailabilityDto } from "../types";
import { useAvailability } from "./use-availability";

const getAvailability = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/get-availability", () => ({
  getAvailability: (...args: unknown[]) => getAvailability(...args),
}));

describe("useAvailability", () => {
  beforeEach(() => {
    getAvailability.mockReset();
  });

  it("stays idle until slug and date are present", () => {
    const { result } = renderHook(() => useAvailability("", ""));
    expect(result.current.status).toBe("idle");
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("starts pending and becomes success when slots exist", async () => {
    let resolve!: (value: unknown) => void;
    getAvailability.mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );

    const { result } = renderHook(() =>
      useAvailability("salao-nails", "2026-09-15"),
    );
    expect(result.current.status).toBe("pending");

    await act(async () => {
      resolve(successAvailabilityFixture);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data?.slots).toHaveLength(1);
  });

  it("uses empty when the day has no free slots", async () => {
    const empty: AvailabilityDto = {
      ...successAvailabilityFixture.data,
      slots: [],
    };
    getAvailability.mockResolvedValue({
      ok: true,
      data: empty,
      requestId: "empty",
    });

    const { result } = renderHook(() =>
      useAvailability("salao-nails", "2026-09-15"),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data?.slots).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it("uses error when the function fails", async () => {
    getAvailability.mockResolvedValue({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Recurso não encontrado.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() =>
      useAvailability("salao-nails", "2026-09-15"),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error?.code).toBe("NOT_FOUND");
  });
});
