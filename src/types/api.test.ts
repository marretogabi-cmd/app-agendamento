import { describe, expect, it } from "vitest";
import { isApiErrorCode } from "./api";

describe("isApiErrorCode", () => {
  it("accepts known codes and rejects others", () => {
    expect(isApiErrorCode("CONFLICT")).toBe(true);
    expect(isApiErrorCode("IDEMPOTENT")).toBe(true);
    expect(isApiErrorCode("oops")).toBe(false);
    expect(isApiErrorCode(409)).toBe(false);
  });
});
