import { describe, expect, it } from "vitest";
import { calendarDays, formatTime, moveMonth } from "./dashboard";

describe("dashboard date helpers", () => {
  it("formats the same instant in the provider timezone", () => {
    expect(formatTime("2026-09-15T12:30:00.000Z", "America/Sao_Paulo")).toBe(
      "09:30",
    );
    expect(formatTime("2026-09-15T12:30:00.000Z", "America/Manaus")).toBe(
      "08:30",
    );
  });

  it("builds a monday-first six-week calendar", () => {
    const days = calendarDays("2026-09-15");
    expect(days).toHaveLength(42);
    expect(days[0]?.date).toBe("2026-08-31");
    expect(days.find((item) => item.date === "2026-09-01")?.currentMonth).toBe(
      true,
    );
  });

  it("moves across year boundaries", () => {
    expect(moveMonth("2026-12-15", 1)).toBe("2027-01-01");
  });
});
