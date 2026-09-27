/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingCalendar } from "./use-booking-calendar";

const getBookingCalendar = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/get-booking-calendar", () => ({
  getBookingCalendar: (...args: unknown[]) => getBookingCalendar(...args),
}));

describe("useBookingCalendar", () => {
  beforeEach(() => getBookingCalendar.mockReset());

  it("stays idle without a complete range", () => {
    const { result } = renderHook(() => useBookingCalendar("slug", "", ""));
    expect(result.current.status).toBe("idle");
    expect(getBookingCalendar).not.toHaveBeenCalled();
  });

  it("exposes empty when the window has no bookable dates", async () => {
    getBookingCalendar.mockResolvedValue({
      ok: true,
      requestId: "empty",
      data: {
        slug: "salao-nails",
        providerName: "Salão Nails",
        timezone: "America/Sao_Paulo",
        startDate: "2026-08-31",
        endDate: "2026-10-11",
        bookableDates: [],
      },
    });

    const { result } = renderHook(() =>
      useBookingCalendar("salao-nails", "2026-08-31", "2026-10-11"),
    );

    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("can refetch the visible window", async () => {
    getBookingCalendar.mockResolvedValue({
      ok: true,
      requestId: "ok",
      data: {
        slug: "salao-nails",
        providerName: "Salão Nails",
        timezone: "America/Sao_Paulo",
        startDate: "2026-08-31",
        endDate: "2026-10-11",
        bookableDates: ["2026-09-29"],
      },
    });

    const { result } = renderHook(() =>
      useBookingCalendar("salao-nails", "2026-08-31", "2026-10-11"),
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    act(() => result.current.refetch());
    await waitFor(() => expect(getBookingCalendar).toHaveBeenCalledTimes(2));
  });
});
