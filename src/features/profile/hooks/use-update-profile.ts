"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { updateProfile } from "../api/update-profile";
import type { UpdateProfileInput } from "../types";

export function useUpdateProfile() {
  const action = useAsyncAction((input: UpdateProfileInput) =>
    updateProfile(createBrowserSupabaseClient(), input),
  );

  return {
    status: action.status,
    data: action.data,
    error: action.error,
    update: action.run,
    isConflict: action.error?.code === "CONFLICT",
  };
}
