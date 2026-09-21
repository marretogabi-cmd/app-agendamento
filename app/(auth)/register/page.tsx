import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizeNextPath, RegisterScreen } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { hasAuthenticatedSession } from "../session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta · Agendamento",
  description: "Crie sua conta para organizar sua agenda.",
};

type RegisterPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const query = await searchParams;
  const nextPath = normalizeNextPath(query.next);

  if (await hasAuthenticatedSession()) {
    redirect(nextPath);
  }

  return <RegisterScreen configured={hasPublicEnv()} nextPath={nextPath} />;
}
