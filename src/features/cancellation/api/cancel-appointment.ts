import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { CancelAppointmentDto } from "../types";
import { toPublicCancellationResult } from "./to-public-result";

function toCancelDto(data: CancelAppointmentDto): CancelAppointmentDto {
  return {
    appointmentId: data.appointmentId,
    status: data.status,
  };
}

export async function cancelAppointment(
  client: SupabaseClient,
  input: { token: string; idempotencyKey: string },
): Promise<ApiResult<CancelAppointmentDto>> {
  const result = await invokeFunction<CancelAppointmentDto>(client, {
    functionName: EdgeFunction.cancelAppointment,
    method: "POST",
    body: { token: input.token },
    idempotencyKey: input.idempotencyKey,
  });

  if (!result.ok) {
    return toPublicCancellationResult(result, input.token);
  }

  return ok(toCancelDto(result.data), result.requestId);
}
