import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { BookAppointmentInput, BookingDto } from "../types";

function toBookingDto(data: BookingDto): BookingDto {
  return {
    appointmentId: data.appointmentId,
    start: data.start,
    end: data.end,
    status: data.status,
  };
}

export async function bookAppointment(
  client: SupabaseClient,
  input: BookAppointmentInput,
): Promise<ApiResult<BookingDto>> {
  const { idempotencyKey, ...body } = input;
  const result = await invokeFunction<BookingDto>(client, {
    functionName: EdgeFunction.bookAppointment,
    method: "POST",
    body,
    idempotencyKey,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toBookingDto(result.data), result.requestId);
}
