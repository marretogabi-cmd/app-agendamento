"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { listClients } from "../api/list-clients";

export function useClients() {
  return useAsyncResource(
    () => listClients(createBrowserSupabaseClient()),
    "clients",
    { isEmpty: (data) => data.length === 0 },
  );
}
