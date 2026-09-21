import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { DailyAgendaDto } from "../types";
import { toDailyAgendaDto } from "./to-daily-agenda-dto";

export async function getDailyAgenda(
  client: SupabaseClient,
  date: string,
): Promise<ApiResult<DailyAgendaDto>> {
  const result = await invokeFunction<DailyAgendaDto>(client, {
    functionName: EdgeFunction.getDailyAgenda,
    method: "GET",
    requireSession: true,
    body: { date },
  });

  if (!result.ok) {
    return result;
  }

  return ok(toDailyAgendaDto(result.data), result.requestId);
}
