/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuleMutation, useRules } from "./use-rules";

const listRules = vi.fn();
const createRule = vi.fn();
const updateRule = vi.fn();
const deleteRule = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/rules", () => ({
  listRules: (...args: unknown[]) => listRules(...args),
  createRule: (...args: unknown[]) => createRule(...args),
  updateRule: (...args: unknown[]) => updateRule(...args),
  deleteRule: (...args: unknown[]) => deleteRule(...args),
}));

const rule = {
  id: "rule-1",
  groupId: "group-1",
  dayOfWeek: 1,
  startTime: "09:00:00",
  endTime: "12:00:00",
};

describe("useRules", () => {
  beforeEach(() => {
    listRules.mockReset();
  });

  it("stays idle without a groupId", () => {
    const { result } = renderHook(() => useRules(""));
    expect(result.current.status).toBe("idle");
    expect(listRules).not.toHaveBeenCalled();
  });

  it("uses empty when the group has no rules", async () => {
    listRules.mockResolvedValue({
      ok: true,
      data: [],
      requestId: "empty",
    });

    const { result } = renderHook(() => useRules("group-1"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data).toEqual([]);
  });
});

describe("useRuleMutation", () => {
  beforeEach(() => {
    createRule.mockReset();
    updateRule.mockReset();
    deleteRule.mockReset();
  });

  it("runs CRUD via functions and exposes CONFLICT on duplicates", async () => {
    createRule.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível. Atualize a agenda.",
        requestId: "err",
      },
    });
    updateRule.mockResolvedValue({
      ok: true,
      data: rule,
      requestId: "ok",
    });
    deleteRule.mockResolvedValue({
      ok: true,
      data: { id: rule.id },
      requestId: "ok",
    });

    const { result } = renderHook(() => useRuleMutation());

    await act(async () => {
      await result.current.create({
        groupId: "group-1",
        dayOfWeek: 1,
        startTime: "09:00:00",
        endTime: "12:00:00",
      });
    });
    await act(async () => {
      await result.current.update({ id: rule.id, dayOfWeek: 2 });
    });
    await act(async () => {
      await result.current.remove(rule.id);
    });

    expect(result.current.isConflict).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isConflict).toBe(false);
  });
});
