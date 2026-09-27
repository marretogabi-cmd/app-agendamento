"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { fail, ok } from "@/lib/api";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { listGroups } from "../api/groups";
import { listRules } from "../api/rules";
import { saveScheduleGroup } from "../api/save-schedule-group";
import type { SaveScheduleGroupInput, ScheduleGroupDetailDto } from "../types";

async function loadScheduleGroups() {
  const client = createBrowserSupabaseClient();
  const groups = await listGroups(client);
  if (!groups.ok) return groups;

  const ruleResults = await Promise.all(
    groups.data.map((group) => listRules(client, group.id)),
  );
  const failure = ruleResults.find((result) => !result.ok);
  if (failure && !failure.ok) return fail(failure.error);

  return ok(
    groups.data.map((group, index): ScheduleGroupDetailDto => ({
      ...group,
      rules: ruleResults[index]?.ok ? ruleResults[index].data : [],
    })),
    groups.requestId,
  );
}

export function useScheduleGroups() {
  return useAsyncResource(loadScheduleGroups, "schedule-groups", {
    isEmpty: (data) => data.length === 0,
  });
}

export function useSaveScheduleGroup() {
  const action = useAsyncAction((input: SaveScheduleGroupInput) =>
    saveScheduleGroup(createBrowserSupabaseClient(), input),
  );

  return {
    status: action.status,
    error: action.error,
    save: action.run,
    isConflict: action.error?.code === "CONFLICT",
  };
}
