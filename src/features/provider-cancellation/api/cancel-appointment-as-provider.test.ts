import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ERROR_MESSAGES, notFoundFixture } from "@/lib/api";
import { cancelAppointmentAsProvider } from "./cancel-appointment-as-provider";

const appointmentId = "apt-1";
const idempotencyKey = "idem-provider-1";

const cancelDto = {
  appointmentId,
  status: "CANCELLED" as const,
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
      data: { ok: true, data: cancelDto, requestId: "cancel-1" },
      error: null,
    });

  return {
    functions: { invoke },
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
  } as unknown as SupabaseClient & {
    functions: { invoke: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
    auth: { getSession: ReturnType<typeof vi.fn> };
  };
}

describe("cancelAppointmentAsProvider", () => {
  it("posts a JWT cancel with Idempotency-Key and no client token", async () => {
    const client = createClient();
    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(cancelDto);
    }
    expect(client.auth.getSession).toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();

    const [, invokeOptions] = client.functions.invoke.mock.calls[0] as [
      string,
      {
        method: string;
        body: Record<string, unknown>;
        headers: Record<string, string>;
      },
    ];
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "cancel-appointment-as-provider",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invokeOptions.body).toEqual({ appointmentId });
    expect(invokeOptions.body).not.toHaveProperty("token");
    expect(invokeOptions.body).not.toHaveProperty("cancellation_token");
    expect(invokeOptions.headers["Idempotency-Key"]).toBe(idempotencyKey);
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("strips a leaked cancellation token from the DTO", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: { ...cancelDto, cancellation_token: "secret-token" },
          requestId: "cancel-2",
        },
        error: null,
      }),
    });

    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(cancelDto);
      expect(JSON.stringify(result.data)).not.toContain("secret-token");
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

    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENT");
    }
  });

  it("maps another provider's appointment to uniform NOT_FOUND", async () => {
    const payload = {
      ...notFoundFixture,
      error: {
        ...notFoundFixture.error,
        message: "appointment belongs to another provider",
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 404 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found", context: response },
      }),
    });

    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe(DEFAULT_ERROR_MESSAGES.NOT_FOUND);
      expect(result.error.message).not.toMatch(/another|seu|inexistente/i);
    }
  });

  it("maps UNAUTHORIZED without enumerating ownership", async () => {
    const payload = {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "not the owner of this appointment",
        requestId: "unauth",
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 403 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "forbidden", context: response },
      }),
    });

    const result = await cancelAppointmentAsProvider(client, {
      appointmentId,
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
      expect(result.error.message).toBe(DEFAULT_ERROR_MESSAGES.UNAUTHORIZED);
      expect(result.error.message).not.toMatch(/owner|seu/i);
    }
  });
});
