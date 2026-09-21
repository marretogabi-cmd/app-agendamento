import { describe, expect, it } from "vitest";
import {
  createAuthCallbackUrl,
  createAuthPageHref,
  normalizeNextPath,
} from "./next-path";

describe("normalizeNextPath", () => {
  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "javascript:alert(1)",
    ["/agenda"],
  ])("rejects unsafe next value %j", (value) => {
    expect(normalizeNextPath(value)).toBe("/");
  });

  it("preserves a safe relative path, query, and hash", () => {
    expect(normalizeNextPath("/agenda?date=2026-09-21#manha")).toBe(
      "/agenda?date=2026-09-21#manha",
    );
  });
});

describe("auth URLs", () => {
  it("builds a callback with an encoded safe destination", () => {
    expect(
      createAuthCallbackUrl("http://localhost:3000", "/agenda?date=2026-09-21"),
    ).toBe(
      "http://localhost:3000/auth/callback?next=%2Fagenda%3Fdate%3D2026-09-21",
    );
  });

  it("omits the default next path from auth-page links", () => {
    expect(createAuthPageHref("/sign-in", "/")).toBe("/sign-in");
    expect(createAuthPageHref("/register", "/agenda")).toBe(
      "/register?next=%2Fagenda",
    );
  });
});
