import { describe, expect, it } from "vitest";
import { applyAuthResponseHeaders } from "./auth-response";

describe("applyAuthResponseHeaders", () => {
  it("sets private no-store defaults", () => {
    const headers = new Headers();
    applyAuthResponseHeaders(headers);

    expect(headers.get("cache-control")).toContain("private");
    expect(headers.get("cache-control")).toContain("no-store");
    expect(headers.get("expires")).toBe("0");
    expect(headers.get("pragma")).toBe("no-cache");
  });

  it("propagates headers supplied by Supabase", () => {
    const headers = new Headers();
    applyAuthResponseHeaders(headers, {
      "Cache-Control": "private, no-store",
      "X-Auth-Test": "set",
    });

    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("x-auth-test")).toBe("set");
  });
});
