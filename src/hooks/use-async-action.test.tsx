/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAsyncAction } from "./use-async-action";
import type { ApiResult } from "@/types/api";

describe("useAsyncAction", () => {
  it("records success and can reset", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(
        async (value: number): Promise<ApiResult<{ value: number }>> => ({
          ok: true,
          data: { value },
          requestId: "ok",
        }),
      ),
    );

    await act(async () => {
      await result.current.run(3);
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual({ value: 3 });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
  });

  it("records envelope errors", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async (): Promise<ApiResult<never>> => ({
        ok: false,
        error: {
          code: "CONFLICT",
          message: "Horário indisponível. Atualize a agenda.",
          requestId: "c",
        },
      })),
    );

    await act(async () => {
      await result.current.run(undefined);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("CONFLICT");
  });

  it("maps thrown errors to UNAVAILABLE", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        throw new Error("network");
      }),
    );

    await act(async () => {
      const outcome = await result.current.run(undefined);
      expect(outcome.ok).toBe(false);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("UNAVAILABLE");
  });
});
