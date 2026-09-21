"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  createGroup,
  deleteGroup,
  listGroups,
  setGroupActive,
  updateGroup,
} from "../api/groups";
import type {
  CreateGroupInput,
  SetGroupActiveInput,
  UpdateGroupInput,
} from "../types";

export function useGroups() {
  return useAsyncResource(
    () => listGroups(createBrowserSupabaseClient()),
    "groups",
    { isEmpty: (data) => data.length === 0 },
  );
}

export function useGroupMutation() {
  const create = useAsyncAction((input: CreateGroupInput) =>
    createGroup(createBrowserSupabaseClient(), input),
  );
  const update = useAsyncAction((input: UpdateGroupInput) =>
    updateGroup(createBrowserSupabaseClient(), input),
  );
  const remove = useAsyncAction((id: string) =>
    deleteGroup(createBrowserSupabaseClient(), id),
  );
  const setActive = useAsyncAction((input: SetGroupActiveInput) =>
    setGroupActive(createBrowserSupabaseClient(), input),
  );

  const lastError =
    create.error ?? update.error ?? remove.error ?? setActive.error;

  const isPending =
    create.status === "pending" ||
    update.status === "pending" ||
    remove.status === "pending" ||
    setActive.status === "pending";

  const reset = () => {
    create.reset();
    update.reset();
    remove.reset();
    setActive.reset();
  };

  return {
    isPending,
    error: lastError,
    isConflict: lastError?.code === "CONFLICT",
    create: create.run,
    update: update.run,
    remove: remove.run,
    setActive: setActive.run,
    reset,
  };
}
