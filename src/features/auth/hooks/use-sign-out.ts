"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { signOut } from "../api/sign-out";

export function useSignOut() {
  const action = useAsyncAction(() => signOut(createBrowserSupabaseClient()));

  return {
    status: action.status,
    error: action.error,
    signOut: () => action.run(undefined),
  };
}
