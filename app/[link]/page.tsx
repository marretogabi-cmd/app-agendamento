import { redirect } from "next/navigation";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ link: string }>;
}) {
  const { link } = await params;
  redirect(`/${encodeURIComponent(link)}/agendar`);
}
