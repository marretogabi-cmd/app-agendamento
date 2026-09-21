/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegister } from "../hooks/use-register";
import { RegisterScreen } from "./register-screen";

const replace = vi.fn();
const refresh = vi.fn();
const registerWithPassword = vi.fn();
const registerWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("../hooks/use-register", () => ({ useRegister: vi.fn() }));

afterEach(cleanup);

function mockAuthState() {
  vi.mocked(useRegister).mockReturnValue({
    password: { status: "idle", error: undefined, data: undefined },
    oauth: { status: "idle", error: undefined, data: undefined },
    registerWithPassword,
    registerWithOAuth,
  });
}

function fillForm(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "prestador@salao.com" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirme a senha"), {
    target: { value: confirmation },
  });
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    registerWithPassword.mockReset();
    registerWithOAuth.mockReset();
    mockAuthState();
  });

  it("rejects different password confirmations locally", async () => {
    render(<RegisterScreen configured nextPath="/" />);
    fillForm("segredo-a", "segredo-b");
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "As senhas precisam ser iguais.",
    );
    expect(registerWithPassword).not.toHaveBeenCalled();
  });

  it("shows a neutral confirmation state when email verification is needed", async () => {
    registerWithPassword.mockResolvedValue({
      ok: true,
      data: { status: "confirmation_required", session: null },
      requestId: "ok",
    });
    render(<RegisterScreen configured nextPath="/agenda" />);
    fillForm("segredo-forte", "segredo-forte");
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Confira seu e-mail")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Use o link recebido para confirmar sua conta.",
    );
  });

  it("redirects an immediately authenticated registration", async () => {
    registerWithPassword.mockResolvedValue({
      ok: true,
      data: { status: "authenticated", session: { access_token: "jwt" } },
      requestId: "ok",
    });
    render(<RegisterScreen configured nextPath="/agenda" />);
    fillForm("segredo-forte", "segredo-forte");
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/agenda");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("starts registration with Google", async () => {
    registerWithOAuth.mockResolvedValue({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Não foi possível autenticar.",
        requestId: "err",
      },
    });
    render(<RegisterScreen configured nextPath="/" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Continuar com Google" }),
    );

    await waitFor(() =>
      expect(registerWithOAuth).toHaveBeenCalledWith("google"),
    );
  });
});
