import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getProfile } from "./get-profile";

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

describe("getProfile", () => {
  it("reads the profile with GET and a required session", async () => {
    const client = createClient();
    const result = await getProfile(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(profileDto);
    }
    expect(client.auth.getSession).toHaveBeenCalled();
    expect(client.functions.invoke).toHaveBeenCalledWith(
      "get-profile",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not call the function without a session", async () => {
    const client = createClient({ session: null });
    const result = await getProfile(client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("strips undocumented fields from the DTO", async () => {
    const client = createClient({
      invoke: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          data: {
            ...profileDto,
            email: "prestador@salao.com",
            authUserId: "auth-1",
          },
          requestId: "profile-2",
        },
        error: null,
      }),
    });

    const result = await getProfile(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(profileDto);
      expect(JSON.stringify(result.data)).not.toContain("prestador@salao.com");
    }
  });
});
