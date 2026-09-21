/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOverrideMutation, useOverrides } from "./use-overrides";

const listOverrides = vi.fn();
const createOverride = vi.fn();
const updateOverride = vi.fn();
const deleteOverride = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/overrides", () => ({
  listOverrides: (...args: unknown[]) => listOverrides(...args),
  createOverride: (...args: unknown[]) => createOverride(...args),
  updateOverride: (...args: unknown[]) => updateOverride(...args),
  deleteOverride: (...args: unknown[]) => deleteOverride(...args),
}));

const block = {
  id: "override-1",
  start: "2026-09-15T12:00:00.000Z",
  end: "2026-09-15T18:00:00.000Z",
  isAvailable: false,
};

const extra = {
  id: "override-2",
  start: "2026-09-16T21:00:00.000Z",
  end: "2026-09-16T22:00:00.000Z",
  isAvailable: true,
};

describe("useOverrides", () => {
  beforeEach(() => {
    listOverrides.mockReset();
  });

  it("uses empty when there are no overrides", async () => {
    listOverrides.mockResolvedValue({
      ok: true,
      data: [],
      requestId: "empty",
    });

    const { result } = renderHook(() => useOverrides());

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it("keeps block and extra flags from the server", async () => {
    listOverrides.mockResolvedValue({
      ok: true,
      data: [block, extra],
      requestId: "ok",
    });

    const { result } = renderHook(() => useOverrides());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual([block, extra]);
  });
});

describe("useOverrideMutation", () => {
  beforeEach(() => {
    createOverride.mockReset();
    updateOverride.mockReset();
    deleteOverride.mockReset();
  });

  it("runs CRUD via functions without merging overlapping overrides", async () => {
    createOverride.mockResolvedValue({
      ok: true,
      data: block,
      requestId: "ok",
    });
    updateOverride.mockResolvedValue({
      ok: true,
      data: extra,
      requestId: "ok",
    });
    deleteOverride.mockResolvedValue({
      ok: true,
      data: { id: block.id },
      requestId: "ok",
    });

    const { result } = renderHook(() => useOverrideMutation());

    await act(async () => {
      await result.current.create({
        start: block.start,
        end: block.end,
        isAvailable: false,
      });
    });
    await act(async () => {
      await result.current.update({ id: extra.id, isAvailable: true });
    });
    await act(async () => {
      await result.current.remove(block.id);
    });

    expect(createOverride).toHaveBeenCalled();
    expect(updateOverride).toHaveBeenCalled();
    expect(deleteOverride).toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBeUndefined();
  });
});
