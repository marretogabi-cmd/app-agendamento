import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { BookingCalendarDto, BookingCalendarQuery } from "../types";

export async function getBookingCalendar(
  client: SupabaseClient,
  query: BookingCalendarQuery,
): Promise<ApiResult<BookingCalendarDto>> {
  return invokeFunction<BookingCalendarDto>(client, {
    functionName: EdgeFunction.getBookingCalendar,
    method: "GET",
    body: query,
  });
}
