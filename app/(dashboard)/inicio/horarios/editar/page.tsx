import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { formValuesFromRules } from "@/components/organisms/schedule-group-form/index.function";
import { ScheduleGroupForm } from "@/components/organisms/schedule-group-form";
import { requireDashboardUser } from "@/features/auth/server/dashboard-session";
import { listGroups, listRules } from "@/features/schedule-rules";

export const metadata: Metadata = {
  title: "Editar horários · Agendamento",
};

type EditarHorariosPageProps = {
  searchParams: Promise<{ grupo?: string | string[] }>;
};

export default async function EditarHorariosPage({
  searchParams,
}: EditarHorariosPageProps) {
  const { grupo } = await searchParams;
  if (typeof grupo !== "string") notFound();

  const { client } = await requireDashboardUser();
  const [groupsResult, rulesResult] = await Promise.all([
    listGroups(client),
    listRules(client, grupo),
  ]);
  if (!groupsResult.ok) {
    if (
      groupsResult.error.code === "NOT_FOUND" ||
      groupsResult.error.code === "VALIDATION"
    )
      notFound();
    throw new Error(groupsResult.error.message);
  }
  if (!rulesResult.ok) {
    if (
      rulesResult.error.code === "NOT_FOUND" ||
      rulesResult.error.code === "VALIDATION"
    )
      notFound();
    throw new Error(rulesResult.error.message);
  }
  const group = groupsResult.data.find((item) => item.id === grupo);
  if (!group || rulesResult.data.length === 0) notFound();
  const formValues = formValuesFromRules(rulesResult.data);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Editar grupo"
        title={group.name}
        description="Altere os dias, faixas e o estado deste grupo."
      />
      <ScheduleGroupForm
        initialValue={{
          id: group.id,
          name: group.name,
          isActive: group.isActive,
          ...formValues,
        }}
        mode="edit"
      />
    </div>
  );
}
