"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "../hooks/use-sign-in";
import { createAuthPageHref, normalizeNextPath } from "../utils/next-path";
import { AuthCard } from "./auth-card";

type SignInScreenProps = {
  configured: boolean;
  initialError?: string;
  nextPath: string;
};

const INITIAL_ERROR_MESSAGES: Record<string, string> = {
  oauth_callback: "Não foi possível entrar com o Google. Tente novamente.",
  session_expired: "Sua sessão expirou. Entre novamente.",
  unavailable: "A autenticação está temporariamente indisponível.",
};

export function SignInScreen({
  configured,
  initialError,
  nextPath,
}: SignInScreenProps) {
  const safeNextPath = normalizeNextPath(nextPath);
  const router = useRouter();
  const auth = useSignIn(safeNextPath);
  const isBusy =
    auth.password.status === "pending" || auth.oauth.status === "pending";
  const errorMessage =
    auth.password.error?.message ??
    auth.oauth.error?.message ??
    (initialError ? INITIAL_ERROR_MESSAGES[initialError] : undefined) ??
    (!configured
      ? "Configure as variáveis públicas do Supabase para entrar."
      : undefined);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || isBusy) return;

    const form = new FormData(event.currentTarget);
    const result = await auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });

    if (result.ok) {
      router.replace(safeNextPath);
      router.refresh();
    }
  }

  async function handleGoogleSignIn() {
    if (!configured || isBusy) return;

    const result = await auth.signInWithOAuth("google");
    if (result.ok) {
      window.location.assign(result.data.url);
    }
  }

  return (
    <AuthCard
      title="Entre na sua conta"
      description="Acesse sua agenda, horários e clientes em um só lugar."
      footer={
        <p>
          Ainda não tem conta?{" "}
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            href={createAuthPageHref("/register", safeNextPath)}
          >
            Criar conta
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
          <label className="fieldset-legend" htmlFor="sign-in-email">
            E-mail
          </label>
          <input
            autoComplete="email"
            className="input input-bordered w-full"
            disabled={!configured || isBusy}
            id="sign-in-email"
            name="email"
            placeholder="voce@exemplo.com"
            required
            type="email"
          />
        </fieldset>

        <fieldset className="fieldset">
          <label className="fieldset-legend" htmlFor="sign-in-password">
            Senha
          </label>
          <input
            autoComplete="current-password"
            className="input input-bordered w-full"
            disabled={!configured || isBusy}
            id="sign-in-password"
            name="password"
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
          Entrar
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
