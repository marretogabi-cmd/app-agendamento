import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createOverride,
  deleteOverride,
  listOverrides,
  updateOverride,
} from "./overrides";

const blockDto = {
  id: "override-1",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T18:00:00.000Z",
  isAvailable: false,
};

const extraDto = {
  id: "override-2",
  start: "2026-09-16T21:00:00.000Z",
  end: "2026-09-16T22:00:00.000Z",
  isAvailable: true,
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
      data: { ok: true, data: [blockDto], requestId: "overrides-1" },
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

describe("overrides api", () => {
  it("lists overrides with GET and a required session", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: [{ ...blockDto, providerId: "secret-provider" }, extraDto],
          requestId: "overrides-1",
        },
        error: null,
      }),
    });

    const result = await listOverrides(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([blockDto, extraDto]);
      expect(result.data[0]?.isAvailable).toBe(false);
      expect(result.data[1]?.isAvailable).toBe(true);
      expect(JSON.stringify(result.data)).not.toContain("secret-provider");
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "list-overrides",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("treats an empty list as success", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: [], requestId: "empty" },
        error: null,
      }),
    });

    const result = await listOverrides(client);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const listed = await listOverrides(client);
    const created = await createOverride(client, {
      start: blockDto.start,
      end: blockDto.end,
      isAvailable: false,
    });
    const updated = await updateOverride(client, { id: blockDto.id });
    const removed = await deleteOverride(client, blockDto.id);

    expect(listed.ok).toBe(false);
    expect(created.ok).toBe(false);
    expect(updated.ok).toBe(false);
    expect(removed.ok).toBe(false);
    if (!listed.ok) {
      expect(listed.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("creates a block and an extra slot without resolving precedence", async () => {
    const client = createClient({
      invoke: vi
        .fn()
        .mockResolvedValueOnce({
          data: { ok: true, data: blockDto, requestId: "block" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ok: true, data: extraDto, requestId: "extra" },
          error: null,
        }),
    });

    const block = await createOverride(client, {
      start: blockDto.start,
      end: blockDto.end,
      isAvailable: false,
    });
    const extra = await createOverride(client, {
      start: extraDto.start,
      end: extraDto.end,
      isAvailable: true,
    });

    expect(block.ok).toBe(true);
    expect(extra.ok).toBe(true);
    if (block.ok && extra.ok) {
      expect(block.data.isAvailable).toBe(false);
      expect(extra.data.isAvailable).toBe(true);
    }
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      1,
      "create-override",
      expect.objectContaining({
        method: "POST",
        body: {
          start: blockDto.start,
          end: blockDto.end,
          isAvailable: false,
        },
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      2,
      "create-override",
      expect.objectContaining({
        body: {
          start: extraDto.start,
          end: extraDto.end,
          isAvailable: true,
        },
      }),
    );
  });

  it("updates a subset and deletes through the Edge Functions", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: extraDto, requestId: "mut" },
        error: null,
      }),
    });

    await updateOverride(client, {
      id: "override-1",
      start: extraDto.start,
      end: extraDto.end,
      isAvailable: true,
    });
    await updateOverride(client, { id: "override-1" });
    await deleteOverride(client, "override-1");

    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      1,
      "update-override",
      expect.objectContaining({
        method: "PATCH",
        body: {
          id: "override-1",
          start: extraDto.start,
          end: extraDto.end,
          isAvailable: true,
        },
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      2,
      "update-override",
      expect.objectContaining({ body: { id: "override-1" } }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      3,
      "delete-override",
      expect.objectContaining({
        method: "POST",
        body: { id: "override-1" },
      }),
    );
  });
});
