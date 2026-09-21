import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { ProviderCancelDto } from "../types";
import { toPublicProviderCancelResult } from "./to-public-result";

function toProviderCancelDto(data: ProviderCancelDto): ProviderCancelDto {
  return {
    appointmentId: data.appointmentId,
    status: data.status,
  };
}

export async function cancelAppointmentAsProvider(
  client: SupabaseClient,
  input: { appointmentId: string; idempotencyKey: string },
): Promise<ApiResult<ProviderCancelDto>> {
  const result = await invokeFunction<ProviderCancelDto>(client, {
    functionName: EdgeFunction.cancelAppointmentAsProvider,
    method: "POST",
    requireSession: true,
    body: { appointmentId: input.appointmentId },
    idempotencyKey: input.idempotencyKey,
  });

  if (!result.ok) {
    return toPublicProviderCancelResult(result);
  }

  return ok(toProviderCancelDto(result.data), result.requestId);
}
