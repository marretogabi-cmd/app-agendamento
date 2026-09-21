/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useClients } from "./use-clients";

const listClients = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("../api/list-clients", () => ({
  listClients: (...args: unknown[]) => listClients(...args),
}));

const clientDto = {
  id: "client-1",
  name: "Ana",
  email: "ana@example.com",
  phone: "11999999999",
};

describe("useClients", () => {
  beforeEach(() => {
    listClients.mockReset();
  });

  it("uses empty when there are no linked clients", async () => {
    listClients.mockResolvedValue({
      ok: true,
      data: [],
      requestId: "empty",
    });

    const { result } = renderHook(() => useClients());

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.data).toEqual([]);
  });

  it("loads clients returned by list-clients", async () => {
    listClients.mockResolvedValue({
      ok: true,
      data: [clientDto],
      requestId: "ok",
    });

    const { result } = renderHook(() => useClients());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual([clientDto]);
  });
});
