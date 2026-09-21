"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ApiResult } from "@/types/api";
import { toApiError } from "@/lib/api";

export type AsyncActionState<T> =
  | { status: "idle"; data: undefined; error: undefined }
  | { status: "pending"; data: T | undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: ApiError };

const idleState = {
  status: "idle" as const,
  data: undefined,
  error: undefined,
};

export function useAsyncAction<TInput, TData>(
  action: (input: TInput) => Promise<ApiResult<TData>>,
) {
  const [state, setState] = useState<AsyncActionState<TData>>(idleState);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const run = useCallback(async (input: TInput): Promise<ApiResult<TData>> => {
    setState((previous) => ({
      status: "pending",
      data: previous.data,
      error: undefined,
    }));

    try {
      const result = await actionRef.current(input);
      if (result.ok) {
        setState({
          status: "success",
          data: result.data,
          error: undefined,
        });
      } else {
        setState({
          status: "error",
          data: undefined,
          error: result.error,
        });
      }
      return result;
    } catch {
      const error = toApiError({
        code: "UNAVAILABLE",
        requestId: "client-unavailable",
      });
      setState({
        status: "error",
        data: undefined,
        error,
      });
      return { ok: false, error };
    }
  }, []);

  const reset = useCallback(() => {
    setState(idleState);
  }, []);

  return { ...state, run, reset };
}
