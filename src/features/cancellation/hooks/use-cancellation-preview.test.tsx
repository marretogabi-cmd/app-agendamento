/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCancellationPreview } from "./use-cancellation-preview";

const getCancellation = vi.fn();
const cancelAppointment = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/get-cancellation", () => ({
  getCancellation: (...args: unknown[]) => getCancellation(...args),
}));

vi.mock("../api/cancel-appointment", () => ({
  cancelAppointment: (...args: unknown[]) => cancelAppointment(...args),
}));

const token = "11111111-2222-3333-4444-555555555555";

const previewDto = {
  appointmentId: "apt-1",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T12:30:00.000Z",
  status: "CONFIRMED" as const,
  providerName: "Salão Nails",
};

describe("useCancellationPreview", () => {
  beforeEach(() => {
    getCancellation.mockReset();
    cancelAppointment.mockReset();
  });

  it("stays idle without a token and does not cancel", () => {
    const { result } = renderHook(() => useCancellationPreview(""));
    expect(result.current.status).toBe("idle");
    expect(getCancellation).not.toHaveBeenCalled();
    expect(cancelAppointment).not.toHaveBeenCalled();
  });

  it("loads a preview without mutating the appointment", async () => {
    getCancellation.mockResolvedValue({
      ok: true,
      data: previewDto,
      requestId: "ok",
    });

    const { result } = renderHook(() => useCancellationPreview(token));

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual(previewDto);
    expect(cancelAppointment).not.toHaveBeenCalled();
  });

  it("exposes uniform NOT_FOUND without the token", async () => {
    getCancellation.mockResolvedValue({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Recurso não encontrado.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useCancellationPreview(token));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error?.code).toBe("NOT_FOUND");
    expect(result.current.error?.message).not.toContain(token);
  });
});
