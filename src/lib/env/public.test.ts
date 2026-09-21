import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnv, hasPublicEnv } from "./public";

describe("public env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports missing public credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(hasPublicEnv()).toBe(false);
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("returns url and anon key when both exist", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(hasPublicEnv()).toBe(true);
    expect(getPublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });
});
