"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getBookingCalendar } from "../api/get-booking-calendar";

export function useBookingCalendar(
  slug: string,
  startDate: string,
  endDate: string,
) {
  return useAsyncResource(
    () =>
      getBookingCalendar(createBrowserSupabaseClient(), {
        slug,
        startDate,
        endDate,
      }),
    `${slug}:${startDate}:${endDate}`,
    {
      enabled: slug.length > 0 && startDate.length > 0 && endDate.length > 0,
      isEmpty: (data) => data.bookableDates.length === 0,
    },
  );
}
