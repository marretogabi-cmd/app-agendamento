import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizeNextPath, SignInScreen } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { hasAuthenticatedSession } from "../session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · Agendamento",
  description: "Entre para gerenciar sua agenda.",
};

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const query = await searchParams;
  const nextPath = normalizeNextPath(query.next);

  if (await hasAuthenticatedSession()) {
    redirect(nextPath);
  }

  return (
    <SignInScreen
      configured={hasPublicEnv()}
      initialError={typeof query.error === "string" ? query.error : undefined}
      nextPath={nextPath}
    />
  );
}
