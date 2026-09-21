"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getProfile } from "../api/get-profile";

export function useProfile() {
  return useAsyncResource(
    () => getProfile(createBrowserSupabaseClient()),
    "profile",
  );
}
