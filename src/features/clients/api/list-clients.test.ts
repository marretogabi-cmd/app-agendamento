import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { listClients } from "./list-clients";

const clientDto = {
  id: "client-1",
  name: "Ana",
  email: "ana@example.com",
  phone: "11999999999",
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
      data: { ok: true, data: [clientDto], requestId: "clients-1" },
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

describe("listClients", () => {
  it("reads linked clients with GET and a required session", async () => {
    const client = createClient();
    const result = await listClients(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([clientDto]);
    }
    expect(client.from).not.toHaveBeenCalled();
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "list-clients",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const result = await listClients(client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("strips undocumented fields from each client", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: [{ ...clientDto, notes: "interno", providerId: "p-1" }],
          requestId: "clients-2",
        },
        error: null,
      }),
    });

    const result = await listClients(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([clientDto]);
      expect(JSON.stringify(result.data)).not.toContain("interno");
    }
  });

  it("treats an empty list as success", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: [], requestId: "empty" },
        error: null,
      }),
    });

    const result = await listClients(client);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
