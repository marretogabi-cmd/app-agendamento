"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "../hooks/use-register";
import { createAuthPageHref, normalizeNextPath } from "../utils/next-path";
import { AuthCard } from "./auth-card";

type RegisterScreenProps = {
  configured: boolean;
  nextPath: string;
};

export function RegisterScreen({ configured, nextPath }: RegisterScreenProps) {
  const safeNextPath = normalizeNextPath(nextPath);
  const router = useRouter();
  const auth = useRegister(safeNextPath);
  const [localError, setLocalError] = useState<string>();
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const isBusy =
    auth.password.status === "pending" || auth.oauth.status === "pending";
  const errorMessage =
    localError ??
    auth.password.error?.message ??
    auth.oauth.error?.message ??
    (!configured
      ? "Configure as variáveis públicas do Supabase para criar uma conta."
      : undefined);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || isBusy) return;

    setLocalError(undefined);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");

    if (password !== passwordConfirmation) {
      setLocalError("As senhas precisam ser iguais.");
      return;
    }

    const result = await auth.registerWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password,
    });

    if (!result.ok) return;
    if (result.data.status === "confirmation_required") {
      setConfirmationRequired(true);
      return;
    }

    router.replace(safeNextPath);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    if (!configured || isBusy) return;

    const result = await auth.registerWithOAuth("google");
    if (result.ok) {
      window.location.assign(result.data.url);
    }
  }

  if (confirmationRequired) {
    return (
      <AuthCard
        title="Confira seu e-mail"
        description="Se o cadastro puder ser concluído, você receberá uma mensagem com o próximo passo."
        footer={
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            href={createAuthPageHref("/sign-in", safeNextPath)}
          >
            Voltar para entrar
          </Link>
        }
      >
        <div className="alert alert-success text-sm" role="status">
          <span>Use o link recebido para confirmar sua conta.</span>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Crie sua conta"
      description="Comece com seu e-mail ou use sua conta Google."
      footer={
        <p>
          Já tem uma conta?{" "}
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            href={createAuthPageHref("/sign-in", safeNextPath)}
          >
            Entrar
          </Link>
        </p>
      }
    >
      {errorMessage ? (
        <div className="alert alert-error text-sm" role="alert">
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handlePasswordSubmit}>
        <fieldset className="fieldset">
          <label className="fieldset-legend" htmlFor="register-email">
            E-mail
          </label>
          <input
            autoComplete="email"
            className="input input-bordered w-full"
            disabled={!configured || isBusy}
            id="register-email"
            name="email"
            placeholder="voce@exemplo.com"
            required
            type="email"
          />
        </fieldset>

        <fieldset className="fieldset">
          <label className="fieldset-legend" htmlFor="register-password">
            Senha
          </label>
          <input
            autoComplete="new-password"
            className="input input-bordered w-full"
            disabled={!configured || isBusy}
            id="register-password"
            minLength={6}
            name="password"
            required
            type="password"
          />
          <p className="label">Use pelo menos 6 caracteres.</p>
        </fieldset>

        <fieldset className="fieldset">
          <label
            className="fieldset-legend"
            htmlFor="register-password-confirmation"
          >
            Confirme a senha
          </label>
          <input
            autoComplete="new-password"
            className="input input-bordered w-full"
            disabled={!configured || isBusy}
            id="register-password-confirmation"
            minLength={6}
            name="passwordConfirmation"
            required
            type="password"
          />
        </fieldset>

        <button
          aria-busy={auth.password.status === "pending"}
          className="btn btn-primary btn-block"
          disabled={!configured || isBusy}
          type="submit"
        >
          {auth.password.status === "pending" ? (
            <span className="loading loading-spinner" aria-hidden="true" />
          ) : null}
          Criar conta
        </button>
      </form>

      <div className="divider text-xs uppercase text-base-content/60">ou</div>

      <button
        aria-busy={auth.oauth.status === "pending"}
        className="btn btn-outline btn-block"
        disabled={!configured || isBusy}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {auth.oauth.status === "pending" ? (
          <span className="loading loading-spinner" aria-hidden="true" />
        ) : null}
        Continuar com Google
      </button>
    </AuthCard>
  );
}
