/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSignIn } from "../hooks/use-sign-in";
import { SignInScreen } from "./sign-in-screen";

const replace = vi.fn();
const refresh = vi.fn();
const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("../hooks/use-sign-in", () => ({ useSignIn: vi.fn() }));

afterEach(cleanup);

function mockAuthState() {
  vi.mocked(useSignIn).mockReturnValue({
    password: { status: "idle", error: undefined, data: undefined },
    oauth: { status: "idle", error: undefined, data: undefined },
    signInWithPassword,
    signInWithOAuth,
  });
}

describe("SignInScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signInWithPassword.mockReset();
    signInWithOAuth.mockReset();
    mockAuthState();
  });

  it("submits password credentials and replaces the URL", async () => {
    signInWithPassword.mockResolvedValue({
      ok: true,
      data: { access_token: "jwt" },
      requestId: "ok",
    });
    render(<SignInScreen configured nextPath="/agenda" />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "prestador@salao.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "segredo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "prestador@salao.com",
        password: "segredo",
      });
      expect(replace).toHaveBeenCalledWith("/agenda");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("starts Google OAuth without exposing provider details", async () => {
    signInWithOAuth.mockResolvedValue({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Não foi possível autenticar.",
        requestId: "err",
      },
    });
    render(<SignInScreen configured nextPath="/agenda" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Continuar com Google" }),
    );

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith("google"));
  });

  it("keeps the form rendered but disabled when env is missing", () => {
    render(<SignInScreen configured={false} nextPath="/" />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Configure as variáveis públicas do Supabase",
    );
    expect(
      (screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
