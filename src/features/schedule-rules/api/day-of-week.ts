import type { DayOfWeek } from "../types";

export function isDayOfWeek(value: number): value is DayOfWeek {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}
