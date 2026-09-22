import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { conflictFixture } from "@/lib/api";
import { createRule, deleteRule, listRules, updateRule } from "./rules";
import type { AvailabilityRuleDto } from "../types";

const ruleDto: AvailabilityRuleDto = {
  id: "rule-1",
  groupId: "group-1",
  dayOfWeek: 1,
  startTime: "09:00:00",
  endTime: "12:00:00",
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
      data: { ok: true, data: [ruleDto], requestId: "rules-1" },
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

describe("rules api", () => {
  it("lists rules for a group with GET and a required session", async () => {
    const client = createClient();
    const result = await listRules(client, "group-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([ruleDto]);
    }
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "list-rules?groupId=group-1",
      expect.objectContaining({
        method: "GET",
        body: undefined,
      }),
    );
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const listed = await listRules(client, "group-1");
    const created = await createRule(client, {
      groupId: "group-1",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "12:00:00",
    });
    const updated = await updateRule(client, { id: "rule-1" });
    const removed = await deleteRule(client, "rule-1");

    expect(listed.ok).toBe(false);
    expect(created.ok).toBe(false);
    expect(updated.ok).toBe(false);
    expect(removed.ok).toBe(false);
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("creates a rule only when dayOfWeek is 1..7", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: ruleDto, requestId: "create" },
        error: null,
      }),
    });

    const created = await createRule(client, {
      groupId: "group-1",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "12:00:00",
    });
    expect(created.ok).toBe(true);

    const invalid = await createRule(client, {
      groupId: "group-1",
      dayOfWeek: 0,
      startTime: "09:00:00",
      endTime: "12:00:00",
    } as never);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION");
    }
    expect(client.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it("updates and deletes through the Edge Functions", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: { ok: true, data: ruleDto, requestId: "mut" },
        error: null,
      }),
    });

    await updateRule(client, {
      id: "rule-1",
      dayOfWeek: 7,
      startTime: "10:00:00",
      endTime: "13:00:00",
    });
    await updateRule(client, { id: "rule-1" });
    await deleteRule(client, "rule-1");

    const invalid = await updateRule(client, {
      id: "rule-1",
      dayOfWeek: 8,
    } as never);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION");
    }

    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      1,
      "update-rule",
      expect.objectContaining({
        method: "PATCH",
        body: {
          id: "rule-1",
          dayOfWeek: 7,
          startTime: "10:00:00",
          endTime: "13:00:00",
        },
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      2,
      "update-rule",
      expect.objectContaining({ body: { id: "rule-1" } }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(
      3,
      "delete-rule",
      expect.objectContaining({
        method: "POST",
        body: { id: "rule-1" },
      }),
    );
    expect(client.functions.invoke).toHaveBeenCalledTimes(3);
  });

  it("forwards CONFLICT on a duplicate weekly interval", async () => {
    const response = new Response(JSON.stringify(conflictFixture), {
      status: 409,
    });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conflict", context: response },
      }),
    });

    const result = await createRule(client, {
      groupId: "group-1",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });
});
