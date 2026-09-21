import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeFunction, ok } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import { EdgeFunction } from "@/types/edge-functions";
import type {
  CreateOverrideInput,
  OverrideDto,
  UpdateOverrideInput,
} from "../types";

const requireSession = true;

function toOverrideDto(data: OverrideDto): OverrideDto {
  return {
    id: data.id,
    start: data.start,
    end: data.end,
    isAvailable: data.isAvailable,
  };
}

export async function listOverrides(
  client: SupabaseClient,
): Promise<ApiResult<OverrideDto[]>> {
  const result = await invokeFunction<OverrideDto[]>(client, {
    functionName: EdgeFunction.listOverrides,
    method: "GET",
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(result.data.map(toOverrideDto), result.requestId);
}

export async function createOverride(
  client: SupabaseClient,
  input: CreateOverrideInput,
): Promise<ApiResult<OverrideDto>> {
  const result = await invokeFunction<OverrideDto>(client, {
    functionName: EdgeFunction.createOverride,
    method: "POST",
    body: {
      start: input.start,
      end: input.end,
      isAvailable: input.isAvailable,
    },
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toOverrideDto(result.data), result.requestId);
}

export async function updateOverride(
  client: SupabaseClient,
  input: UpdateOverrideInput,
): Promise<ApiResult<OverrideDto>> {
  const body: Record<string, unknown> = { id: input.id };
  if (input.start !== undefined) {
    body.start = input.start;
  }
  if (input.end !== undefined) {
    body.end = input.end;
  }
  if (input.isAvailable !== undefined) {
    body.isAvailable = input.isAvailable;
  }

  const result = await invokeFunction<OverrideDto>(client, {
    functionName: EdgeFunction.updateOverride,
    method: "PATCH",
    body,
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok(toOverrideDto(result.data), result.requestId);
}

export async function deleteOverride(
  client: SupabaseClient,
  id: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await invokeFunction<{ id: string }>(client, {
    functionName: EdgeFunction.deleteOverride,
    method: "POST",
    body: { id },
    requireSession,
  });

  if (!result.ok) {
    return result;
  }

  return ok({ id: result.data.id }, result.requestId);
}
