import { describe, expect, it } from "vitest";
import { isDayOfWeek } from "./day-of-week";

describe("isDayOfWeek", () => {
  it("accepts 1 through 7", () => {
    expect(isDayOfWeek(1)).toBe(true);
    expect(isDayOfWeek(7)).toBe(true);
  });

  it("rejects values outside the schema", () => {
    expect(isDayOfWeek(0)).toBe(false);
    expect(isDayOfWeek(8)).toBe(false);
    expect(isDayOfWeek(1.5)).toBe(false);
  });
});
