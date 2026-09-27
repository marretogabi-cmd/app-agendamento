import { requireCompleteProfile } from "@/features/auth/server/dashboard-session";

export default async function CompleteProfileLayout({
  children,
}: LayoutProps<"/inicio">) {
  await requireCompleteProfile();
  return children;
}
