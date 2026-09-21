"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getAvailability } from "../api/get-availability";

export function useAvailability(slug: string, date: string) {
  return useAsyncResource(
    () => getAvailability(createBrowserSupabaseClient(), { slug, date }),
    `${slug}:${date}`,
    {
      enabled: slug.length > 0 && date.length > 0,
      isEmpty: (data) => data.slots.length === 0,
    },
  );
}
