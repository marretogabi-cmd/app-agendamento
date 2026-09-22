import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ERROR_MESSAGES, notFoundFixture } from "@/lib/api";
import { getCancellation } from "./get-cancellation";

const token = "11111111-2222-3333-4444-555555555555";

const previewDto = {
  appointmentId: "apt-1",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T12:30:00.000Z",
  status: "CONFIRMED" as const,
  providerName: "Salão Nails",
};

function createClient(overrides?: { invoke?: ReturnType<typeof vi.fn> }) {
  const invoke =
    overrides?.invoke ??
    vi.fn().mockResolvedValue({
      data: { ok: true, data: previewDto, requestId: "preview-1" },
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

describe("getCancellation", () => {
  it("reads preview with GET and does not require a session", async () => {
    const client = createClient();
    const result = await getCancellation(client, token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(previewDto);
      expect(result.data).not.toHaveProperty("token");
      expect(result.data).not.toHaveProperty("cancellation_token");
    }
    expect(client.auth.getSession).not.toHaveBeenCalled();
    expect(client.functions.invoke).toHaveBeenCalledWith(
      `get-cancellation?token=${token}`,
      expect.objectContaining({
        method: "GET",
        body: undefined,
      }),
    );
    expect(client.functions.invoke).not.toHaveBeenCalledWith(
      "cancel-appointment",
      expect.anything(),
    );
  });

  it("strips a leaked token from the preview DTO", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: { ...previewDto, token, cancellation_token: token },
          requestId: "preview-2",
        },
        error: null,
      }),
    });

    const result = await getCancellation(client, token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(previewDto);
      expect(JSON.stringify(result.data)).not.toContain(token);
    }
  });

  it("maps invalid tokens to uniform NOT_FOUND", async () => {
    const payload = {
      ...notFoundFixture,
      error: {
        ...notFoundFixture.error,
        message: `cancellation_token=${token} inexistente`,
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 404 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found", context: response },
      }),
    });

    const result = await getCancellation(client, token);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe(DEFAULT_ERROR_MESSAGES.NOT_FOUND);
      expect(result.error.message).not.toContain(token);
      expect(result.error.message).not.toMatch(/inválido|inexistente/i);
    }
  });
});
