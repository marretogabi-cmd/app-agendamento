import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type { SaveScheduleGroupInput, SavedScheduleGroupDto } from "../types";

export async function saveScheduleGroup(
  client: SupabaseClient,
  input: SaveScheduleGroupInput,
): Promise<ApiResult<SavedScheduleGroupDto>> {
  const result = await invokeFunction<SavedScheduleGroupDto>(client, {
    functionName: EdgeFunction.saveScheduleGroup,
    method: "POST",
    requireSession: true,
    body: input,
  });

  if (!result.ok) return result;

  return ok(
    {
      group: {
        id: result.data.group.id,
        name: result.data.group.name,
        isActive: result.data.group.isActive,
      },
      rules: result.data.rules.map((rule) => ({
        id: rule.id,
        groupId: rule.groupId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
    },
    result.requestId,
  );
}
