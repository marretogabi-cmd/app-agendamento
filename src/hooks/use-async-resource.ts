"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ApiResult } from "@/types/api";

export type AsyncResourceState<T> =
  | { status: "idle"; data: undefined; error: undefined }
  | { status: "pending"; data: T | undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "empty"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: ApiError };

const idleState = {
  status: "idle" as const,
  data: undefined,
  error: undefined,
};

export function useAsyncResource<T>(
  fetcher: () => Promise<ApiResult<T>>,
  key: string,
  options?: {
    enabled?: boolean;
    isEmpty?: (data: T) => boolean;
  },
) {
  const enabled = options?.enabled ?? true;
  const isEmpty = options?.isEmpty;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<AsyncResourceState<T>>(
    enabled
      ? { status: "pending", data: undefined, error: undefined }
      : idleState,
  );

  const fetcherRef = useRef(fetcher);
  const isEmptyRef = useRef(isEmpty);

  useEffect(() => {
    fetcherRef.current = fetcher;
    isEmptyRef.current = isEmpty;
  }, [fetcher, isEmpty]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    // Fetch remoto: o pending precisa ir para o estado da UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hook de leitura remota
    setState((previous) => ({
      status: "pending",
      data: previous.data,
      error: undefined,
    }));

    void fetcherRef
      .current()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          const empty = isEmptyRef.current?.(result.data) ?? false;
          setState({
            status: empty ? "empty" : "success",
            data: result.data,
            error: undefined,
          });
          return;
        }
        setState({
          status: "error",
          data: undefined,
          error: result.error,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          data: undefined,
          error: {
            code: "UNAVAILABLE",
            message: "Serviço temporariamente indisponível.",
            requestId: "client-unavailable",
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, key, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  if (!enabled) {
    return { ...idleState, refetch };
  }

  return { ...state, refetch };
}
