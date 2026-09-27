import {
  localRuleRange,
  rangesOverlap,
  splitIntoHourlySlots,
} from "./availability.ts";

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
