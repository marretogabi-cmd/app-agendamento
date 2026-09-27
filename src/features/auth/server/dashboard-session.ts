import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/features/profile";
import { hasPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const requireDashboardUser = cache(async () => {
  if (!hasPublicEnv()) redirect("/sign-in?next=%2Finicio");

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/sign-in?next=%2Finicio");

  return {
    client,
    id: data.user.id,
    email: data.user.email ?? "",
  };
});

export const requireCompleteProfile = cache(async () => {
  const { client } = await requireDashboardUser();
  const result = await getProfile(client);
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      redirect("/perfil?primeiro-acesso=1");
    }
    throw new Error(result.error.message);
  }
  if (!result.data.phone) redirect("/perfil?primeiro-acesso=1");
  return result.data;
});
