import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { conflictFixture } from "@/lib/api";
import {
  createGroup,
  deleteGroup,
  listGroups,
  setGroupActive,
  updateGroup,
} from "./groups";

const groupDto = {
  id: "group-1",
  name: "Semana",
  isActive: false,
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
      data: { ok: true, data: [groupDto], requestId: "groups-1" },
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

describe("groups api", () => {
  it("lists groups with GET and a required session", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: [{ ...groupDto, providerId: "secret-provider" }],
          requestId: "groups-1",
        },
        error: null,
      }),
    });

    const result = await listGroups(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([groupDto]);
      expect(JSON.stringify(result.data)).not.toContain("secret-provider");
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "list-groups",
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

    const result = await listGroups(client);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const listed = await listGroups(client);
    const created = await createGroup(client, { name: "Semana" });
    const updated = await updateGroup(client, { id: "group-1" });
    const removed = await deleteGroup(client, "group-1");
    const activated = await setGroupActive(client, {
      id: "group-1",
      isActive: true,
    });

    expect(listed.ok).toBe(false);
    expect(created.ok).toBe(false);
    expect(updated.ok).toBe(false);
    expect(removed.ok).toBe(false);
    expect(activated.ok).toBe(false);
    if (!listed.ok) {
      expect(listed.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("creates, updates and deletes through the Edge Functions", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: groupDto, requestId: "mut" },
        error: null,
      }),
    });

    await createGroup(client, { name: "Semana" });
    await updateGroup(client, { id: "group-1", name: "Noite" });
    await updateGroup(client, { id: "group-1" });
    await deleteGroup(client, "group-1");

    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      1,
      "create-group",
      expect.objectContaining({
        method: "POST",
        body: { name: "Semana" },
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      2,
      "update-group",
      expect.objectContaining({
        method: "PATCH",
        body: { id: "group-1", name: "Noite" },
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      3,
      "update-group",
      expect.objectContaining({ body: { id: "group-1" } }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      4,
      "delete-group",
      expect.objectContaining({
        method: "POST",
        body: { id: "group-1" },
      }),
    );
  });

  it("forwards CONFLICT when activating a group collides", async () => {
    const response = new Response(JSON.stringify(conflictFixture), {
      status: 409,
    });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conflict", context: response },
      }),
    });

    const result = await setGroupActive(client, {
      id: "group-1",
      isActive: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "set-group-active",
      expect.objectContaining({
        method: "POST",
        body: { id: "group-1", isActive: true },
      }),
    );
  });

  it("returns the group after a successful activation", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: { ...groupDto, isActive: true },
          requestId: "active",
        },
        error: null,
      }),
    });

    const result = await setGroupActive(client, {
      id: "group-1",
      isActive: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
