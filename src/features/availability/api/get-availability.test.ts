import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { notFoundFixture, successAvailabilityFixture } from "@/lib/api";
import { getAvailability } from "./get-availability";

function createClient(overrides?: { invoke?: ReturnType<typeof vi.fn> }) {
  const invoke =
    overrides?.invoke ??
    vi.fn().mockResolvedValue({
      data: successAvailabilityFixture,
      error: null,
    });

  return {
    functions: { invoke },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  } as unknown as SupabaseClient & {
    functions: { invoke: ReturnType<typeof vi.fn> };
    auth: { getSession: ReturnType<typeof vi.fn> };
  };
}

describe("getAvailability", () => {
  it("invokes the public GET without requiring a session", async () => {
    const client = createClient();

    const result = await getAvailability(client, {
      slug: "salao-nails",
      date: "2026-09-15",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots).toHaveLength(1);
      expect(result.data).not.toHaveProperty("email");
      expect(result.data).not.toHaveProperty("phone");
    }
    expect(client.auth.getSession).not.toHaveBeenCalled();
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "get-availability?slug=salao-nails&date=2026-09-15",
      expect.objectContaining({
        method: "GET",
        body: undefined,
      }),
    );
  });

  it("treats an empty slot list as success", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: {
            slug: "salao-nails",
            date: "2026-09-15",
            timezone: "America/Sao_Paulo",
            slots: [],
          },
          requestId: "empty",
        },
        error: null,
      }),
    });

    const result = await getAvailability(client, {
      slug: "salao-nails",
      date: "2026-09-15",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots).toEqual([]);
    }
  });

  it("forwards NOT_FOUND without extra enumeration", async () => {
    const response = new Response(JSON.stringify(notFoundFixture), {
      status: 404,
    });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found", context: response },
      }),
    });

    const result = await getAvailability(client, {
      slug: "nao-existe",
      date: "2026-09-15",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).not.toMatch(/existe|email|telefone/i);
    }
  });
});
