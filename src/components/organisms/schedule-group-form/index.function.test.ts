import { describe, expect, it } from "vitest";
import {
  formValuesFromRules,
  summarizeDays,
  summarizeRanges,
  validateSchedule,
} from "./index.function";

describe("schedule group form helpers", () => {
  it("accepts common one-hour ranges including half-hour starts", () => {
    expect(
      validateSchedule({
        name: "Semana",
        days: [1, 2, 3, 4, 5],
        ranges: [
          { startTime: "08:30", endTime: "12:30" },
          { startTime: "13:30", endTime: "17:30" },
        ],
        isActive: true,
      }),
    ).toBeUndefined();
  });

  it("rejects overlaps and ranges that do not contain complete hours", () => {
    expect(
      validateSchedule({
        name: "Semana",
        days: [1],
        ranges: [
          { startTime: "08:00", endTime: "12:00" },
          { startTime: "11:00", endTime: "13:00" },
        ],
        isActive: false,
      }),
    ).toMatch(/sobrepor/i);

    expect(
      validateSchedule({
        name: "Semana",
        days: [1],
        ranges: [{ startTime: "08:30", endTime: "12:00" }],
        isActive: false,
      }),
    ).toMatch(/horas completas/i);
  });

  it("hydrates and summarizes a canonical cartesian rule set", () => {
    const rules = [
      {
        id: "1",
        groupId: "g",
        dayOfWeek: 1 as const,
        startTime: "08:00:00",
        endTime: "12:00:00",
      },
      {
        id: "2",
        groupId: "g",
        dayOfWeek: 2 as const,
        startTime: "08:00:00",
        endTime: "12:00:00",
      },
      {
        id: "3",
        groupId: "g",
        dayOfWeek: 3 as const,
        startTime: "08:00:00",
        endTime: "12:00:00",
      },
      {
        id: "4",
        groupId: "g",
        dayOfWeek: 4 as const,
        startTime: "08:00:00",
        endTime: "12:00:00",
      },
      {
        id: "5",
        groupId: "g",
        dayOfWeek: 5 as const,
        startTime: "08:00:00",
        endTime: "12:00:00",
      },
    ];

    expect(formValuesFromRules(rules)).toEqual({
      days: [1, 2, 3, 4, 5],
      ranges: [{ startTime: "08:00", endTime: "12:00" }],
    });
    expect(summarizeDays(rules)).toBe("Segunda a sexta");
    expect(summarizeRanges(rules)).toBe("08:00–12:00");
  });
});
