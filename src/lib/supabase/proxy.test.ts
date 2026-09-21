import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicEnv, hasPublicEnv } from "../env/public";
import { updateSession } from "./proxy";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("../env/public", () => ({
  hasPublicEnv: vi.fn(),
  getPublicEnv: vi.fn(),
}));

describe("updateSession", () => {
  beforeEach(() => {
    vi.mocked(hasPublicEnv).mockReset();
    vi.mocked(getPublicEnv).mockReset();
    vi.mocked(createServerClient).mockReset();
  });

  it("skips Auth refresh when public env is missing", async () => {
    vi.mocked(hasPublicEnv).mockReturnValue(false);
    const request = new NextRequest("http://localhost:3000/");

    const response = await updateSession(request);

    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("refreshes the user when public env exists", async () => {
    vi.mocked(hasPublicEnv).mockReturnValue(true);
    vi.mocked(getPublicEnv).mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
    let cookies: CookieAdapter | undefined;
    const getClaims = vi.fn().mockImplementation(async () => {
      cookies?.setAll(
        [{ name: "sb-access-token", value: "tok", options: { path: "/" } }],
        {
          "Cache-Control": "private, no-store",
          Expires: "0",
          Pragma: "no-cache",
        },
      );
      return { data: { claims: null }, error: null };
    });
    type CookieAdapter = {
      getAll: () => { name: string; value: string }[];
      setAll: (
        cookies: { name: string; value: string; options?: { path?: string } }[],
        headers: Record<string, string>,
      ) => void;
    };
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      cookies = (options as { cookies: CookieAdapter }).cookies;
      return { auth: { getClaims } } as never;
    });

    const request = new NextRequest("http://localhost:3000/");
    const response = await updateSession(request);

    expect(createServerClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.any(Object),
    );
    expect(getClaims).toHaveBeenCalled();
    expect(cookies?.getAll()).toEqual([
      { name: "sb-access-token", value: "tok" },
    ]);
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-access-token")?.value).toBe("tok");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
