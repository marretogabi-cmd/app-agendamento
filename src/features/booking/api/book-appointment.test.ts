import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { conflictFixture } from "@/lib/api";
import { bookAppointment } from "./book-appointment";
import type { BookAppointmentInput } from "../types";

const input: BookAppointmentInput = {
  slug: "salao-nails",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T12:30:00.000Z",
  client: {
    name: "Ana",
    email: "ana@example.com",
    phone: "11999999999",
  },
  idempotencyKey: "idem-attempt-1",
};

const bookingDto = {
  appointmentId: "apt-1",
  start: input.start,
  end: input.end,
  status: "CONFIRMED" as const,
};

function createClient(overrides?: { invoke?: ReturnType<typeof vi.fn> }) {
  const invoke =
    overrides?.invoke ??
    vi.fn().mockResolvedValue({
      data: { ok: true, data: bookingDto, requestId: "book-1" },
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

describe("bookAppointment", () => {
  it("posts the public booking with a stable Idempotency-Key header", async () => {
    const client = createClient();
    const result = await bookAppointment(client, input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(bookingDto);
      expect(result.data).not.toHaveProperty("cancellation_token");
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
      "book-appointment",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invokeOptions.body).toEqual({
      slug: input.slug,
      start: input.start,
      end: input.end,
      client: input.client,
    });
    expect(invokeOptions.body).not.toHaveProperty("idempotencyKey");
    expect(invokeOptions.headers["Idempotency-Key"]).toBe("idem-attempt-1");
  });

  it("strips cancellation_token from a successful DTO", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: {
            ...bookingDto,
            cancellation_token: "secret-token",
          },
          requestId: "book-2",
        },
        error: null,
      }),
    });

    const result = await bookAppointment(client, input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(bookingDto);
      expect(JSON.stringify(result.data)).not.toContain("secret-token");
      expect(Object.keys(result.data).sort()).toEqual([
        "appointmentId",
        "end",
        "start",
        "status",
      ]);
    }
  });

  it("forwards CONFLICT so the UI can reload availability", async () => {
    const response = new Response(JSON.stringify(conflictFixture), {
      status: 409,
    });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conflict", context: response },
      }),
    });

    const result = await bookAppointment(client, input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });

  it("forwards IDEMPOTENT as an already-applied result", async () => {
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

    const result = await bookAppointment(client, input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENT");
      expect(result.error.message).not.toMatch(/interno|tente de novo/i);
    }
  });
});
