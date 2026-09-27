import type { Metadata } from "next";
import { DetailsScreen } from "@/features/public-booking";

export const metadata: Metadata = {
  title: "Seus dados · Lume Agendas",
};

export default function DetailsPage() {
  return <DetailsScreen />;
}
