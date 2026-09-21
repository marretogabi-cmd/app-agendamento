import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { AvailabilityDto, AvailabilityQuery } from "../types";

export async function getAvailability(
  client: SupabaseClient,
  query: AvailabilityQuery,
): Promise<ApiResult<AvailabilityDto>> {
  return invokeFunction<AvailabilityDto>(client, {
    functionName: EdgeFunction.getAvailability,
    method: "GET",
    body: query,
  });
}
