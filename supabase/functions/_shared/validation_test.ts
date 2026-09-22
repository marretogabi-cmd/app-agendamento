import {
  assertInterval,
  dateString,
  email,
  slug,
  timeString,
  uuid,
} from "./validation.ts";
import { ApiError } from "./types.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assertApiError(callback: () => unknown, field: string): void {
  try {
    callback();
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "VALIDATION" &&
      error.fieldErrors?.[field]
    ) return;
    throw error;
  }
  throw new Error("Expected ApiError");
}

Deno.test("normalizes public inputs", () => {
  assertEquals(slug({ slug: "  Salao-Centro  " }), "salao-centro");
  assertEquals(
    email({ email: " CLIENTE@EXAMPLE.COM " }, "email"),
    "cliente@example.com",
  );
  assertEquals(timeString({ start: "09:30" }, "start"), "09:30:00");
});

Deno.test("accepts real calendar dates and UUIDs", () => {
  assertEquals(dateString({ date: "2028-02-29" }, "date"), "2028-02-29");
  assertEquals(
    uuid({ id: "8b37f6a7-6f55-4d35-8ef6-9cb47ad599b4" }, "id"),
    "8b37f6a7-6f55-4d35-8ef6-9cb47ad599b4",
  );
});

Deno.test("rejects malformed or inverted values", () => {
  assertApiError(() => dateString({ date: "2027-02-29" }, "date"), "date");
  assertApiError(() => uuid({ id: "not-a-uuid" }, "id"), "id");
  assertApiError(
    () =>
      assertInterval(
        "2026-09-21T10:00:00.000Z",
        "2026-09-21T09:00:00.000Z",
      ),
    "end",
  );
});
