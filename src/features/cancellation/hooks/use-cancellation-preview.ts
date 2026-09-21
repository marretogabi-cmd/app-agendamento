"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getCancellation } from "../api/get-cancellation";

export function useCancellationPreview(token: string) {
  return useAsyncResource(
    () => getCancellation(createBrowserSupabaseClient(), token),
    token,
    { enabled: token.length > 0 },
  );
}
