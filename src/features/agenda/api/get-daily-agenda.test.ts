import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getDailyAgenda } from "./get-daily-agenda";

const agendaDto = {
  date: "2026-09-15",
  slots: [
    {
      start: "2026-09-15T12:00:00.000Z",
      end: "2026-09-15T12:30:00.000Z",
      state: "available" as const,
    },
    {
      start: "2026-09-15T12:30:00.000Z",
      end: "2026-09-15T13:00:00.000Z",
      state: "booked" as const,
      appointmentId: "apt-1",
    },
    {
      start: "2026-09-15T13:00:00.000Z",
      end: "2026-09-15T13:30:00.000Z",
      state: "blocked" as const,
    },
  ],
};

function createClient(overrides?: {
  session?: { access_token: string } | null;
  invoke?: ReturnType<typeof vi.fn>;
}) {
  const session =
    overrides && "session" in overrides
      ? overrides.session
      : { access_token: "jwt" };
  const invoke =
    overrides?.invoke ??
    vi.fn().mockResolvedValue({
      data: { ok: true, data: agendaDto, requestId: "agenda-1" },
      error: null,
    });

  return {
    functions: { invoke },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
  } as unknown as SupabaseClient & {
    functions: { invoke: ReturnType<typeof vi.fn> };
    auth: { getSession: ReturnType<typeof vi.fn> };
  };
}

describe("getDailyAgenda", () => {
  it("reads the day with GET and a required session", async () => {
    const client = createClient();
    const result = await getDailyAgenda(client, "2026-09-15");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots.map((slot) => slot.state)).toEqual([
        "available",
        "booked",
        "blocked",
      ]);
      expect(result.data.slots[1]?.appointmentId).toBe("apt-1");
      expect(result.data.slots[0]).not.toHaveProperty("appointmentId");
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "get-daily-agenda",
      expect.objectContaining({
        method: "GET",
        body: { date: "2026-09-15" },
      }),
    );
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const result = await getDailyAgenda(client, "2026-09-15");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("strips cancellation tokens and email from booked slots", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: {
            date: "2026-09-15",
            slots: [
              {
                start: "2026-09-15T12:30:00.000Z",
                end: "2026-09-15T13:00:00.000Z",
                state: "booked",
                appointmentId: "apt-1",
                cancellation_token: "secret-token",
                email: "ana@example.com",
              },
            ],
          },
          requestId: "agenda-2",
        },
        error: null,
      }),
    });

    const result = await getDailyAgenda(client, "2026-09-15");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots[0]).toEqual({
        start: "2026-09-15T12:30:00.000Z",
        end: "2026-09-15T13:00:00.000Z",
        state: "booked",
        appointmentId: "apt-1",
      });
      expect(JSON.stringify(result.data)).not.toContain("secret-token");
      expect(JSON.stringify(result.data)).not.toContain("ana@example.com");
    }
  });

  it("treats a day without slots as success", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: { date: "2026-09-15", slots: [] },
          requestId: "empty",
        },
        error: null,
      }),
    });

    const result = await getDailyAgenda(client, "2026-09-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots).toEqual([]);
    }
  });
});
