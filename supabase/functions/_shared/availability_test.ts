import {
  calendarDateRange,
  localRuleRange,
  rangesOverlap,
  splitIntoHourlySlots,
} from "./availability.ts";
import { availabilityCacheKey } from "./cache.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("splits ranges into exact one-hour slots and drops the remainder", () => {
  const slots = splitIntoHourlySlots([
    { start: "2026-10-01T11:30:00.000Z", end: "2026-10-01T16:00:00.000Z" },
  ]);
  assertEquals(slots.length, 4);
  assertEquals(slots[0], {
    start: "2026-10-01T11:30:00.000Z",
    end: "2026-10-01T12:30:00.000Z",
  });
});

Deno.test("splits a 13:00-17:00 Sao Paulo range into four local-hour slots", () => {
  const range = localRuleRange(
    "2026-10-08",
    "13:00:00",
    "17:00:00",
    "America/Sao_Paulo",
  );
  const slots = splitIntoHourlySlots([range]);

  assertEquals(slots, [
    { start: "2026-10-08T16:00:00.000Z", end: "2026-10-08T17:00:00.000Z" },
    { start: "2026-10-08T17:00:00.000Z", end: "2026-10-08T18:00:00.000Z" },
    { start: "2026-10-08T18:00:00.000Z", end: "2026-10-08T19:00:00.000Z" },
    { start: "2026-10-08T19:00:00.000Z", end: "2026-10-08T20:00:00.000Z" },
  ]);
});

Deno.test("uses the current availability cache schema", () => {
  assertEquals(
    availabilityCacheKey("provider-1", "3", "2026-10-08"),
    "availability:v2:provider-1:3:2026-10-08",
  );
});

Deno.test("keeps each source range anchored independently", () => {
  const slots = splitIntoHourlySlots([
    { start: "2026-10-01T11:30:00Z", end: "2026-10-01T13:30:00Z" },
    { start: "2026-10-01T11:00:00Z", end: "2026-10-01T12:00:00Z" },
  ]);

  assertEquals(slots, [
    { start: "2026-10-01T11:30:00.000Z", end: "2026-10-01T12:30:00.000Z" },
    { start: "2026-10-01T12:30:00.000Z", end: "2026-10-01T13:30:00.000Z" },
    { start: "2026-10-01T11:00:00.000Z", end: "2026-10-01T12:00:00.000Z" },
  ]);
});

Deno.test("converts local Brazilian schedules to UTC", () => {
  const expectedStarts = new Map([
    ["America/Noronha", "2026-10-01T10:00:00Z"],
    ["America/Sao_Paulo", "2026-10-01T11:00:00Z"],
    ["America/Manaus", "2026-10-01T12:00:00Z"],
    ["America/Rio_Branco", "2026-10-01T13:00:00Z"],
  ]);
  for (const [timezone, expected] of expectedStarts) {
    const range = localRuleRange(
      "2026-10-01",
      "08:00:00",
      "12:00:00",
      timezone,
    );
    assertEquals(range.start, expected);
  }
});

Deno.test("detects partial overlaps with blocks and bookings", () => {
  assertEquals(
    rangesOverlap(
      { start: "2026-10-01T11:00:00Z", end: "2026-10-01T12:00:00Z" },
      { start: "2026-10-01T11:30:00Z", end: "2026-10-01T12:30:00Z" },
    ),
    true,
  );
  assertEquals(
    rangesOverlap(
      { start: "2026-10-01T11:00:00Z", end: "2026-10-01T12:00:00Z" },
      { start: "2026-10-01T12:00:00Z", end: "2026-10-01T13:00:00Z" },
    ),
    false,
  );
});

Deno.test("builds calendar windows with an inclusive 42-day limit", () => {
  const dates = calendarDateRange("2026-08-31", "2026-10-11");
  assertEquals(dates.length, 42);
  assertEquals(dates[0], "2026-08-31");
  assertEquals(dates.at(-1), "2026-10-11");

  let reversed = false;
  try {
    calendarDateRange("2026-10-11", "2026-08-31");
  } catch (error) {
    reversed = error instanceof RangeError;
  }
  assertEquals(reversed, true);

  let tooLarge = false;
  try {
    calendarDateRange("2026-08-31", "2026-10-12");
  } catch (error) {
    tooLarge = error instanceof RangeError;
  }
  assertEquals(tooLarge, true);
});
