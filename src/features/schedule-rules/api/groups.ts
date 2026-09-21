import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type {
  CreateGroupInput,
  RuleGroupDto,
  SetGroupActiveInput,
  UpdateGroupInput,
} from "../types";

const requireSession = true;

function toGroupDto(data: RuleGroupDto): RuleGroupDto {
  return {
    id: data.id,
    name: data.name,
    isActive: data.isActive,
  };
}

export async function listGroups(
  client: SupabaseClient,
): Promise<ApiResult<RuleGroupDto[]>> {
  const result = await invokeFunction<RuleGroupDto[]>(client, {
    functionName: EdgeFunction.listGroups,
    method: "GET",
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(result.data.map(toGroupDto), result.requestId);
}

export async function createGroup(
  client: SupabaseClient,
  input: CreateGroupInput,
): Promise<ApiResult<RuleGroupDto>> {
  const result = await invokeFunction<RuleGroupDto>(client, {
    functionName: EdgeFunction.createGroup,
    method: "POST",
    body: { name: input.name },
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toGroupDto(result.data), result.requestId);
}

export async function updateGroup(
  client: SupabaseClient,
  input: UpdateGroupInput,
): Promise<ApiResult<RuleGroupDto>> {
  const body: Record<string, unknown> = { id: input.id };
  if (input.name !== undefined) {
    body.name = input.name;
  }

  const result = await invokeFunction<RuleGroupDto>(client, {
    functionName: EdgeFunction.updateGroup,
    method: "PATCH",
    body,
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toGroupDto(result.data), result.requestId);
}

export async function deleteGroup(
  client: SupabaseClient,
  id: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await invokeFunction<{ id: string }>(client, {
    functionName: EdgeFunction.deleteGroup,
    method: "POST",
    body: { id },
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok({ id: result.data.id }, result.requestId);
}

export async function setGroupActive(
  client: SupabaseClient,
  input: SetGroupActiveInput,
): Promise<ApiResult<RuleGroupDto>> {
  const result = await invokeFunction<RuleGroupDto>(client, {
    functionName: EdgeFunction.setGroupActive,
    method: "POST",
    body: { id: input.id, isActive: input.isActive },
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toGroupDto(result.data), result.requestId);
}
