import { describe, expect, it, vi } from "vitest";
import { invokeFunction } from "./invoke-function";

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
      data: { ok: true, data: { slots: [] }, requestId: "server-1" },
      error: null,
    });

  return {
    functions: { invoke },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session },
      }),
    },
  };
}

describe("invokeFunction", () => {
  it("parses a success envelope", async () => {
    const client = createClient();
    const result = await invokeFunction<{ slots: unknown[] }>(client, {
      functionName: "get-availability",
      body: { slug: "salao", date: "2026-09-15" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots).toEqual([]);
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "get-availability",
      expect.objectContaining({
        body: { slug: "salao", date: "2026-09-15" },
      }),
    );
  });

  it("maps 409 CONFLICT from Functions error context", async () => {
    const payload = {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível.",
        requestId: "req-409",
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 409 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conflict", context: response },
      }),
    });

    const result = await invokeFunction(client, {
      functionName: "book-appointment",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.requestId).toBe("req-409");
    }
  });

  it("maps 404 without echoing secrets", async () => {
    const payload = {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "cancellation_token=super-secret",
        requestId: "req-404",
      },
    };
    const response = new Response(JSON.stringify(payload), { status: 404 });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found", context: response },
      }),
    });

    const result = await invokeFunction(client, {
      functionName: "get-cancellation",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).not.toContain("super-secret");
    }
  });

  it("rejects private calls without a session", async () => {
    const client = createClient({ session: null });
    const result = await invokeFunction(client, {
      functionName: "get-profile",
      requireSession: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("sends Idempotency-Key and x-request-id", async () => {
    const client = createClient();
    await invokeFunction(client, {
      functionName: "book-appointment",
      idempotencyKey: "idem-1",
      body: { slug: "a" },
    });

    const [, invokeOptions] = client.functions.invoke.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(invokeOptions.headers["Idempotency-Key"]).toBe("idem-1");
    expect(invokeOptions.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("wraps a raw DTO as success", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { appointmentId: "a1" },
        error: null,
      }),
    });

    const result = await invokeFunction<{ appointmentId: string }>(client, {
      functionName: "book-appointment",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.appointmentId).toBe("a1");
    }
  });

  it("maps timeout to UNAVAILABLE", async () => {
    const client = createClient({
      invoke: vi.fn().mockImplementation(() => new Promise(() => undefined)),
    });

    const result = await invokeFunction(client, {
      functionName: "get-availability",
      timeoutMs: 20,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAVAILABLE");
    }
  });
});
