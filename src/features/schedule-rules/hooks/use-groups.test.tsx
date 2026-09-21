/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGroupMutation, useGroups } from "./use-groups";

const listGroups = vi.fn();
const createGroup = vi.fn();
const updateGroup = vi.fn();
const deleteGroup = vi.fn();
const setGroupActive = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/groups", () => ({
  listGroups: (...args: unknown[]) => listGroups(...args),
  createGroup: (...args: unknown[]) => createGroup(...args),
  updateGroup: (...args: unknown[]) => updateGroup(...args),
  deleteGroup: (...args: unknown[]) => deleteGroup(...args),
  setGroupActive: (...args: unknown[]) => setGroupActive(...args),
}));

const group = { id: "group-1", name: "Semana", isActive: false };

describe("useGroups", () => {
  beforeEach(() => {
    listGroups.mockReset();
  });

  it("uses empty when there are no groups", async () => {
    listGroups.mockResolvedValue({
      ok: true,
      data: [],
      requestId: "empty",
    });

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it("loads groups without flipping isActive locally", async () => {
    listGroups.mockResolvedValue({
      ok: true,
      data: [group],
      requestId: "ok",
    });

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data?.[0]?.isActive).toBe(false);
  });
});

describe("useGroupMutation", () => {
  beforeEach(() => {
    createGroup.mockReset();
    updateGroup.mockReset();
    deleteGroup.mockReset();
    setGroupActive.mockReset();
  });

  it("runs CRUD via functions and exposes CONFLICT on activation", async () => {
    createGroup.mockResolvedValue({
      ok: true,
      data: group,
      requestId: "ok",
    });
    updateGroup.mockResolvedValue({
      ok: true,
      data: { ...group, name: "Noite" },
      requestId: "ok",
    });
    deleteGroup.mockResolvedValue({
      ok: true,
      data: { id: group.id },
      requestId: "ok",
    });
    setGroupActive.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível. Atualize a agenda.",
        requestId: "err",
      },
    });

    const { result } = renderHook(() => useGroupMutation());

    await act(async () => {
      await result.current.create({ name: "Semana" });
    });
    await act(async () => {
      await result.current.update({ id: group.id, name: "Noite" });
    });
    await act(async () => {
      await result.current.remove(group.id);
    });
    await act(async () => {
      await result.current.setActive({ id: group.id, isActive: true });
    });

    expect(setGroupActive).toHaveBeenCalled();
    expect(result.current.isConflict).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isConflict).toBe(false);
    expect(result.current.isPending).toBe(false);
  });
});
