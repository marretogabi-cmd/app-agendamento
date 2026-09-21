import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { ClientListItemDto } from "../types";
import { toClientListItemDto } from "./to-client-list-item-dto";

export async function listClients(
  client: SupabaseClient,
): Promise<ApiResult<ClientListItemDto[]>> {
  const result = await invokeFunction<ClientListItemDto[]>(client, {
    functionName: EdgeFunction.listClients,
    method: "GET",
    requireSession: true,
  });

  if (!result.ok) {
    return result;
  }

  return ok(result.data.map(toClientListItemDto), result.requestId);
}
