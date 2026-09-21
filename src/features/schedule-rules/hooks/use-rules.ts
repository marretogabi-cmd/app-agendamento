"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createRule, deleteRule, listRules, updateRule } from "../api/rules";
import type { CreateRuleInput, UpdateRuleInput } from "../types";

export function useRules(groupId: string) {
  return useAsyncResource(
    () => listRules(createBrowserSupabaseClient(), groupId),
    groupId,
    {
      enabled: groupId.length > 0,
      isEmpty: (data) => data.length === 0,
    },
  );
}

export function useRuleMutation() {
  const create = useAsyncAction((input: CreateRuleInput) =>
    createRule(createBrowserSupabaseClient(), input),
  );
  const update = useAsyncAction((input: UpdateRuleInput) =>
    updateRule(createBrowserSupabaseClient(), input),
  );
  const remove = useAsyncAction((id: string) =>
    deleteRule(createBrowserSupabaseClient(), id),
  );

  const lastError = create.error ?? update.error ?? remove.error;
  const isPending =
    create.status === "pending" ||
    update.status === "pending" ||
    remove.status === "pending";

  const reset = () => {
    create.reset();
    update.reset();
    remove.reset();
  };

  return {
    isPending,
    error: lastError,
    isConflict: lastError?.code === "CONFLICT",
    create: create.run,
    update: update.run,
    remove: remove.run,
    reset,
  };
}
