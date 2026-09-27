import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getBookingCalendar } from "./get-booking-calendar";

const calendarDto = {
  slug: "salao-nails",
  providerName: "Salão Nails",
  timezone: "America/Sao_Paulo",
  startDate: "2026-08-31",
  endDate: "2026-10-11",
  bookableDates: ["2026-09-29"],
};

function createClient() {
  const invoke = vi.fn().mockResolvedValue({
    data: { ok: true, data: calendarDto, requestId: "calendar-1" },
    error: null,
  });
  return {
    functions: { invoke },
    auth: { getSession: vi.fn() },
  } as unknown as SupabaseClient & {
    functions: { invoke: ReturnType<typeof vi.fn> };
    auth: { getSession: ReturnType<typeof vi.fn> };
  };
}

describe("getBookingCalendar", () => {
  it("loads a public 42-day window without a session", async () => {
    const client = createClient();
    const result = await getBookingCalendar(client, {
      slug: "salao-nails",
      startDate: "2026-08-31",
      endDate: "2026-10-11",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(calendarDto);
      expect(result.data).not.toHaveProperty("providerId");
      expect(result.data).not.toHaveProperty("client");
    }
    expect(client.auth.getSession).not.toHaveBeenCalled();
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "get-booking-calendar?slug=salao-nails&startDate=2026-08-31&endDate=2026-10-11",
      expect.objectContaining({ method: "GET", body: undefined }),
    );
  });
});
