import type { Metadata } from "next";
import { AgendaScreen } from "@/features/dashboard/components/agenda-screen";
import { requireCompleteProfile } from "@/features/auth/server/dashboard-session";

export const metadata: Metadata = {
  title: "Agendamentos · Agendamento",
};

export default async function AgendamentosPage() {
  const profile = await requireCompleteProfile();
  return <AgendaScreen timezone={profile.timezone} />;
}
