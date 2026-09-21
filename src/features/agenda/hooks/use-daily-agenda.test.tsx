/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyAgenda } from "./use-daily-agenda";

const getDailyAgenda = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/get-daily-agenda", () => ({
  getDailyAgenda: (...args: unknown[]) => getDailyAgenda(...args),
}));

const agenda = {
  date: "2026-09-15",
  slots: [
    {
      start: "2026-09-15T12:00:00.000Z",
      end: "2026-09-15T12:30:00.000Z",
      state: "available" as const,
    },
  ],
};

describe("useDailyAgenda", () => {
  beforeEach(() => {
    getDailyAgenda.mockReset();
  });

  it("stays idle without a date", () => {
    const { result } = renderHook(() => useDailyAgenda(""));
    expect(result.current.status).toBe("idle");
    expect(getDailyAgenda).not.toHaveBeenCalled();
  });

  it("uses empty when the day has no slots", async () => {
    getDailyAgenda.mockResolvedValue({
      ok: true,
      data: { date: "2026-09-15", slots: [] },
      requestId: "empty",
    });

    const { result } = renderHook(() => useDailyAgenda("2026-09-15"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data?.slots).toEqual([]);
  });

  it("loads available, booked and blocked slots", async () => {
    getDailyAgenda.mockResolvedValue({
      ok: true,
      data: agenda,
      requestId: "ok",
    });

    const { result } = renderHook(() => useDailyAgenda("2026-09-15"));

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data?.slots[0]?.state).toBe("available");
    expect(result.current.data).not.toHaveProperty("email");
  });
});
