import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { CancellationPreviewDto } from "../types";
import { toPublicCancellationResult } from "./to-public-result";

function toPreviewDto(data: CancellationPreviewDto): CancellationPreviewDto {
  return {
    appointmentId: data.appointmentId,
    start: data.start,
    end: data.end,
    status: data.status,
    providerName: data.providerName,
  };
}

export async function getCancellation(
  client: SupabaseClient,
  token: string,
): Promise<ApiResult<CancellationPreviewDto>> {
  const result = await invokeFunction<CancellationPreviewDto>(client, {
    functionName: EdgeFunction.getCancellation,
    method: "GET",
    body: { token },
  });

  if (!result.ok) {
    return toPublicCancellationResult(result, token);
  }

  return ok(toPreviewDto(result.data), result.requestId);
}
