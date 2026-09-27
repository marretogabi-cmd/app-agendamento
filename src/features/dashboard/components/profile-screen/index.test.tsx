// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clipboardWrite: vi.fn(),
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  routerReplace: vi.fn(),
  signOut: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    refresh: mocks.routerRefresh,
    replace: mocks.routerReplace,
  }),
}));
vi.mock("@/features/auth", () => ({
  useSignOut: () => ({
    status: "idle",
    error: undefined,
    signOut: mocks.signOut,
  }),
}));
vi.mock("@/features/profile", () => ({
  useUpdateProfile: () => ({
    status: "idle",
    error: undefined,
    update: mocks.update,
  }),
}));

import { ProfileScreen } from ".";

const profile = {
  id: "provider-1",
  name: "Ana",
  publicSlug: "ana-servicos",
  phone: "11999999999",
  timezone: "America/Sao_Paulo" as const,
  updatedAt: "2026-09-26T12:00:00.000Z",
};

afterEach(cleanup);

describe("ProfileScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clipboardWrite.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue({ ok: true, data: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.clipboardWrite },
    });
  });

  it("shows and copies the provider public link", async () => {
    render(
      <ProfileScreen
        email="ana@example.com"
        firstAccess={false}
        initialProfile={profile}
      />,
    );

    expect(screen.getByText("/ana-servicos/agendar")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar link de compartilhamento" }),
    );

    await waitFor(() =>
      expect(mocks.clipboardWrite).toHaveBeenCalledWith(
        `${window.location.origin}/ana-servicos/agendar`,
      ),
    );
    expect(
      await screen.findByText("Link de compartilhamento copiado."),
    ).toBeTruthy();
  });

  it("offers logout during first access and redirects to sign in", async () => {
    render(
      <ProfileScreen
        email="ana@example.com"
        firstAccess
        initialProfile={profile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.routerReplace).toHaveBeenCalledWith("/sign-in");
    expect(mocks.routerRefresh).toHaveBeenCalledOnce();
  });
});
