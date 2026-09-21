"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  createOverride,
  deleteOverride,
  listOverrides,
  updateOverride,
} from "../api/overrides";
import type { CreateOverrideInput, UpdateOverrideInput } from "../types";

export function useOverrides() {
  return useAsyncResource(
    () => listOverrides(createBrowserSupabaseClient()),
    "overrides",
    { isEmpty: (data) => data.length === 0 },
  );
}

export function useOverrideMutation() {
  const create = useAsyncAction((input: CreateOverrideInput) =>
    createOverride(createBrowserSupabaseClient(), input),
  );
  const update = useAsyncAction((input: UpdateOverrideInput) =>
    updateOverride(createBrowserSupabaseClient(), input),
  );
  const remove = useAsyncAction((id: string) =>
    deleteOverride(createBrowserSupabaseClient(), id),
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
    create: create.run,
    update: update.run,
    remove: remove.run,
    reset,
  };
}
