/** @vitest-environment jsdom */

import type { Session } from "@supabase/supabase-js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "./use-session";

const getSession = vi.fn();
const unsubscribe = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
    },
  }),
}));

describe("useSession", () => {
  beforeEach(() => {
    getSession.mockReset();
    unsubscribe.mockReset();
    onAuthStateChange.mockReset();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  it("starts pending and becomes unauthenticated without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe("pending");

    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("becomes authenticated when Auth returns a session", async () => {
    const session = {
      access_token: "jwt",
      user: { id: "user-1", email: "prestador@salao.com" },
    } as Session;
    getSession.mockResolvedValue({ data: { session } });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });
    expect(result.current.user?.id).toBe("user-1");
  });

  it("falls back to unauthenticated if getSession fails", async () => {
    getSession.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });
  });

  it("follows Auth state changes and unsubscribes on unmount", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    let listener: (event: string, session: Session | null) => void = () => {};
    onAuthStateChange.mockImplementation((callback) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result, unmount } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });

    const session = {
      access_token: "jwt",
      user: { id: "user-2" },
    } as Session;

    act(() => {
      listener("SIGNED_IN", session);
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user?.id).toBe("user-2");

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
