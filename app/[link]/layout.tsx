import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BookingFlowProvider,
  PublicBookingShell,
} from "@/features/public-booking";

export const metadata: Metadata = {
  title: "Agendar · Lume Agendas",
  description: "Escolha uma data e reserve seu horário online.",
};

export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ link: string }>;
}) {
  const { link } = await params;

  return (
    <BookingFlowProvider key={link} slug={link}>
      <PublicBookingShell>{children}</PublicBookingShell>
    </BookingFlowProvider>
  );
}
