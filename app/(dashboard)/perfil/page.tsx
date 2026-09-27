import type { Metadata } from "next";
import { ProfileScreen } from "@/features/dashboard/components/profile-screen";
import { requireDashboardUser } from "@/features/auth/server/dashboard-session";
import { getProfile } from "@/features/profile";

export const metadata: Metadata = {
  title: "Perfil · Agendamento",
};

type PerfilPageProps = {
  searchParams: Promise<{ "primeiro-acesso"?: string | string[] }>;
};

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const query = await searchParams;
  const { client, email } = await requireDashboardUser();
  const profile = await getProfile(client);
  if (!profile.ok && profile.error.code !== "NOT_FOUND") {
    throw new Error(profile.error.message);
  }

  return (
    <ProfileScreen
      email={email}
      firstAccess={query["primeiro-acesso"] === "1" || !profile.ok}
      initialProfile={profile.ok ? profile.data : undefined}
    />
  );
}
