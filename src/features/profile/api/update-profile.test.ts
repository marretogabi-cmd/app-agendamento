import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { conflictFixture } from "@/lib/api";
import { updateProfile } from "./update-profile";

const profileDto = {
  id: "profile-1",
  name: "Luciane",
  publicSlug: "luciane-nails",
  phone: "11999999999",
  updatedAt: "2026-09-14T12:00:00.000Z",
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
      data: { ok: true, data: profileDto, requestId: "profile-1" },
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

describe("updateProfile", () => {
  it("patches only documented fields with a required session", async () => {
    const client = createClient();
    const result = await updateProfile(client, {
      name: "Luciane",
      publicSlug: "luciane-nails",
      phone: "11999999999",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(profileDto);
    }
    expect(client.auth.getSession).toHaveBeenCalled();

    const [, invokeOptions] = client.functions.invoke.mock.calls[0] as [
      string,
      { method: string; body: Record<string, unknown> },
    ];
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "update-profile",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(invokeOptions.body).toEqual({
      name: "Luciane",
      publicSlug: "luciane-nails",
      phone: "11999999999",
    });
    expect(invokeOptions.body).not.toHaveProperty("id");
    expect(invokeOptions.body).not.toHaveProperty("email");
  });

  it("sends a subset and ignores auth.users fields", async () => {
    const client = createClient();
    await updateProfile(client, {
      name: "Luciane",
      phone: null,
      email: "prestador@salao.com",
    } as never);

    const [, invokeOptions] = client.functions.invoke.mock.calls[0] as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(invokeOptions.body).toEqual({ name: "Luciane", phone: null });
    expect(invokeOptions.body).not.toHaveProperty("email");
    expect(invokeOptions.body).not.toHaveProperty("publicSlug");
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const result = await updateProfile(client, { name: "Luciane" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("forwards CONFLICT when the public slug is taken", async () => {
    const response = new Response(JSON.stringify(conflictFixture), {
      status: 409,
    });
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conflict", context: response },
      }),
    });

    const result = await updateProfile(client, {
      publicSlug: "slug-em-uso",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });
});
