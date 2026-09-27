import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { saveScheduleGroup } from "./save-schedule-group";

function createClient() {
  const invoke = vi.fn().mockResolvedValue({
    data: {
      ok: true,
      data: {
        group: { id: "group-1", name: "Semana", isActive: true },
        rules: [
          {
            id: "rule-1",
            groupId: "group-1",
            dayOfWeek: 1,
            startTime: "08:00:00",
            endTime: "12:00:00",
            providerId: "secret",
          },
        ],
      },
      requestId: "save-1",
    },
    error: null,
  });
  return {
    functions: { invoke },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "jwt" } },
      }),
    },
  } as unknown as SupabaseClient & {
    functions: { invoke: ReturnType<typeof vi.fn> };
  };
}

describe("saveScheduleGroup", () => {
  it("sends the aggregate command and strips undocumented fields", async () => {
    const client = createClient();
    const input = {
      name: "Semana",
      days: [1, 2, 3, 4, 5] as const,
      ranges: [{ startTime: "08:00", endTime: "12:00" }],
      isActive: true,
    };
    const result = await saveScheduleGroup(client, {
      ...input,
      days: [...input.days],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rules[0]).not.toHaveProperty("providerId");
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "save-schedule-group",
      expect.objectContaining({
        method: "POST",
        body: { ...input, days: [...input.days] },
      }),
    );
  });
});
