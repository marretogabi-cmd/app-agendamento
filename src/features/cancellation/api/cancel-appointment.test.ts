import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ERROR_MESSAGES, notFoundFixture } from "@/lib/api";
import { cancelAppointment } from "./cancel-appointment";

const token = "11111111-2222-3333-4444-555555555555";
const idempotencyKey = "idem-cancel-1";

const cancelDto = {
  appointmentId: "apt-1",
  status: "CANCELLED" as const,
};

function createClient(overrides?: { invoke?: ReturnType<typeof vi.fn> }) {
  const invoke =
    overrides?.invoke ??
    vi.fn().mockResolvedValue({
      data: { ok: true, data: cancelDto, requestId: "cancel-1" },
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

describe("cancelAppointment", () => {
  it("posts an explicit cancel with Idempotency-Key", async () => {
    const client = createClient();
    const result = await cancelAppointment(client, { token, idempotencyKey });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(cancelDto);
    }
    expect(client.auth.getSession).not.toHaveBeenCalled();

    const [, invokeOptions] = client.functions.invoke.mock.calls[0] as [
      string,
      {
        method: string;
        body: Record<string, unknown>;
        headers: Record<string, string>;
      },
    ];
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "cancel-appointment",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invokeOptions.body).toEqual({ token });
    expect(invokeOptions.body).not.toHaveProperty("idempotencyKey");
    expect(invokeOptions.headers["Idempotency-Key"]).toBe(idempotencyKey);
  });

  it("strips a leaked token from the cancel DTO", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: { ...cancelDto, cancellation_token: token },
          requestId: "cancel-2",
        },
        error: null,
      }),
    });

    const result = await cancelAppointment(client, { token, idempotencyKey });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(cancelDto);
      expect(JSON.stringify(result.data)).not.toContain(token);
    }
  });

  it("forwards IDEMPOTENT when the cancel was already applied", async () => {
    const payload = {
      ok: false,
      error: {
        code: "IDEMPOTENT",
        message: "Esta operação já foi concluída.",
        requestId: "idem-409",
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 409 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "idempotent", context: response },
      }),
    });

    const result = await cancelAppointment(client, { token, idempotencyKey });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENT");
    }
  });

  it("maps invalid tokens to uniform NOT_FOUND", async () => {
    const payload = {
      ...notFoundFixture,
      error: {
        ...notFoundFixture.error,
        message: `cancellation_token=${token} expirado`,
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 404 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found", context: response },
      }),
    });

    const result = await cancelAppointment(client, { token, idempotencyKey });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe(DEFAULT_ERROR_MESSAGES.NOT_FOUND);
      expect(result.error.message).not.toContain(token);
    }
  });
});
