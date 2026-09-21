/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCancelAppointment } from "./use-cancel-appointment";

const cancelAppointment = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/cancel-appointment", () => ({
  cancelAppointment: (...args: unknown[]) => cancelAppointment(...args),
}));

const token = "11111111-2222-3333-4444-555555555555";

const cancelDto = {
  appointmentId: "apt-1",
  status: "CANCELLED" as const,
};

describe("useCancelAppointment", () => {
  beforeEach(() => {
    cancelAppointment.mockReset();
  });

  it("retries with the same Idempotency-Key", async () => {
    cancelAppointment.mockResolvedValue({
      ok: true,
      data: cancelDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useCancelAppointment());

    await act(async () => {
      await result.current.cancel(token);
    });
    await act(async () => {
      await result.current.cancel(token);
    });

    const firstKey = cancelAppointment.mock.calls[0]?.[1]?.idempotencyKey;
    const secondKey = cancelAppointment.mock.calls[1]?.[1]?.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);
    expect(cancelAppointment.mock.calls[0]?.[1]?.token).toBe(token);
  });

  it("treats IDEMPOTENT as already applied", async () => {
    cancelAppointment.mockResolvedValue({
      ok: false,
      error: {
        code: "IDEMPOTENT",
        message: "Esta operação já foi concluída.",
        requestId: "idem",
      },
    });

    const { result } = renderHook(() => useCancelAppointment());

    await act(async () => {
      await result.current.cancel(token);
    });

    expect(result.current.isIdempotent).toBe(true);
    expect(result.current.error?.code).toBe("IDEMPOTENT");
  });

  it("waits for POST before exposing a cancelled appointment", async () => {
    let resolve!: (value: unknown) => void;
    cancelAppointment.mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );

    const { result } = renderHook(() => useCancelAppointment());
    expect(result.current.status).toBe("idle");

    let cancelPromise: Promise<unknown>;
    act(() => {
      cancelPromise = result.current.cancel(token);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("pending");
    });
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      resolve({ ok: true, data: cancelDto, requestId: "ok" });
      await cancelPromise;
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(cancelDto);
  });
});
