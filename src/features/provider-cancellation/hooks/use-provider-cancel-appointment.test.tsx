/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProviderCancelAppointment } from "./use-provider-cancel-appointment";

const cancelAppointmentAsProvider = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/cancel-appointment-as-provider", () => ({
  cancelAppointmentAsProvider: (...args: unknown[]) =>
    cancelAppointmentAsProvider(...args),
}));

const appointmentId = "apt-1";

const cancelDto = {
  appointmentId,
  status: "CANCELLED" as const,
};

describe("useProviderCancelAppointment", () => {
  beforeEach(() => {
    cancelAppointmentAsProvider.mockReset();
  });

  it("retries with the same Idempotency-Key and no client token", async () => {
    cancelAppointmentAsProvider.mockResolvedValue({
      ok: true,
      data: cancelDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useProviderCancelAppointment());

    await act(async () => {
      await result.current.cancel(appointmentId);
    });
    await act(async () => {
      await result.current.cancel(appointmentId);
    });

    const first = cancelAppointmentAsProvider.mock.calls[0]?.[1];
    const second = cancelAppointmentAsProvider.mock.calls[1]?.[1];
    expect(first?.appointmentId).toBe(appointmentId);
    expect(first?.idempotencyKey).toEqual(expect.any(String));
    expect(second?.idempotencyKey).toBe(first?.idempotencyKey);
    expect(first).not.toHaveProperty("token");
  });

  it("treats IDEMPOTENT as already applied", async () => {
    cancelAppointmentAsProvider.mockResolvedValue({
      ok: false,
      error: {
        code: "IDEMPOTENT",
        message: "Esta operação já foi concluída.",
        requestId: "idem",
      },
    });

    const { result } = renderHook(() => useProviderCancelAppointment());

    await act(async () => {
      await result.current.cancel(appointmentId);
    });

    expect(result.current.isIdempotent).toBe(true);
    expect(result.current.error?.code).toBe("IDEMPOTENT");
  });

  it("waits for POST before exposing a cancelled appointment", async () => {
    let resolve!: (value: unknown) => void;
    cancelAppointmentAsProvider.mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );

    const { result } = renderHook(() => useProviderCancelAppointment());
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeUndefined();

    let cancelPromise: Promise<unknown>;
    act(() => {
      cancelPromise = result.current.cancel(appointmentId);
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
