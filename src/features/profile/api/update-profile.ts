import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { ProfileDto, UpdateProfileInput } from "../types";
import { toProfileDto } from "./to-profile-dto";

function toUpdateBody(input: UpdateProfileInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) {
    body.name = input.name;
  }
  if (input.publicSlug !== undefined) {
    body.publicSlug = input.publicSlug;
  }
  if (input.phone !== undefined) {
    body.phone = input.phone;
  }
  return body;
}

export async function updateProfile(
  client: SupabaseClient,
  input: UpdateProfileInput,
): Promise<ApiResult<ProfileDto>> {
  const result = await invokeFunction<ProfileDto>(client, {
    functionName: EdgeFunction.updateProfile,
    method: "PATCH",
    requireSession: true,
    body: toUpdateBody(input),
  });

  if (!result.ok) {
    return result;
  }

  return ok(toProfileDto(result.data), result.requestId);
}
