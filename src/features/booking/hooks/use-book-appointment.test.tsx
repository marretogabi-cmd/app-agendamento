/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookAppointment } from "./use-book-appointment";

const bookAppointment = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/book-appointment", () => ({
  bookAppointment: (...args: unknown[]) => bookAppointment(...args),
}));

const form = {
  slug: "salao-nails",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T12:30:00.000Z",
  client: {
    name: "Ana",
    email: "ana@example.com",
    phone: "11999999999",
  },
};

const bookingDto = {
  appointmentId: "apt-1",
  start: form.start,
  end: form.end,
  status: "CONFIRMED" as const,
};

describe("useBookAppointment", () => {
  beforeEach(() => {
    bookAppointment.mockReset();
  });

  it("reuses the same Idempotency-Key until beginNewAttempt", async () => {
    bookAppointment.mockResolvedValue({
      ok: true,
      data: bookingDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useBookAppointment());
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      await result.current.book(form);
    });
    await act(async () => {
      await result.current.book(form);
    });

    const firstKey = bookAppointment.mock.calls[0]?.[1]?.idempotencyKey;
    const secondKey = bookAppointment.mock.calls[1]?.[1]?.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);

    act(() => {
      result.current.beginNewAttempt();
    });

    await act(async () => {
      await result.current.book(form);
    });

    const thirdKey = bookAppointment.mock.calls[2]?.[1]?.idempotencyKey;
    expect(thirdKey).not.toBe(firstKey);
    expect(result.current.isConflict).toBe(false);
  });

  it("exposes isConflict without confirming the booking", async () => {
    bookAppointment.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível. Atualize a agenda.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useBookAppointment());

    await act(async () => {
      await result.current.book(form);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isConflict).toBe(true);
    expect(result.current.isIdempotent).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("treats IDEMPOTENT as already applied, not a generic failure", async () => {
    bookAppointment.mockResolvedValue({
      ok: false,
      error: {
        code: "IDEMPOTENT",
        message: "Esta operação já foi concluída.",
        requestId: "idem",
      },
    });

    const { result } = renderHook(() => useBookAppointment());

    await act(async () => {
      await result.current.book(form);
    });

    expect(result.current.isIdempotent).toBe(true);
    expect(result.current.isConflict).toBe(false);
    expect(result.current.error?.code).toBe("IDEMPOTENT");
    expect(result.current.error?.message).not.toMatch(/interno|tente de novo/i);
  });

  it("waits for the function before exposing a confirmed booking", async () => {
    let resolve!: (value: unknown) => void;
    bookAppointment.mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );

    const { result } = renderHook(() => useBookAppointment());

    let bookPromise: Promise<unknown>;
    act(() => {
      bookPromise = result.current.book(form);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("pending");
    });
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      resolve({ ok: true, data: bookingDto, requestId: "ok" });
      await bookPromise;
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(bookingDto);
    expect(result.current.data).not.toHaveProperty("cancellation_token");
  });
});
