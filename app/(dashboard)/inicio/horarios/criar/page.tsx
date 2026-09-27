import type { Metadata } from "next";
import { PageHeader } from "@/components/molecules/page-header";
import { ScheduleGroupForm } from "@/components/organisms/schedule-group-form";

export const metadata: Metadata = {
  title: "Criar horários · Agendamento",
};

export default function CriarHorariosPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Novo grupo"
        title="Criar horários"
        description="Selecione dias com a mesma rotina e informe quando seus clientes podem agendar."
      />
      <ScheduleGroupForm mode="create" />
    </div>
  );
}
