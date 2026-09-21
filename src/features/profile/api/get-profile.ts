import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { ProfileDto } from "../types";
import { toProfileDto } from "./to-profile-dto";

export async function getProfile(
  client: SupabaseClient,
): Promise<ApiResult<ProfileDto>> {
  const result = await invokeFunction<ProfileDto>(client, {
    functionName: EdgeFunction.getProfile,
    method: "GET",
    requireSession: true,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toProfileDto(result.data), result.requestId);
}
