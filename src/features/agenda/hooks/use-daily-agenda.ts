"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getDailyAgenda } from "../api/get-daily-agenda";

export function useDailyAgenda(date: string) {
  return useAsyncResource(
    () => getDailyAgenda(createBrowserSupabaseClient(), date),
    date,
    {
      enabled: date.length > 0,
      isEmpty: (data) => data.slots.length === 0,
    },
  );
}
