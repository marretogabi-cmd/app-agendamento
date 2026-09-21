"use client";

import { useRef } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cancelAppointment } from "../api/cancel-appointment";

export function useCancelAppointment() {
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const action = useAsyncAction((token: string) =>
    cancelAppointment(createBrowserSupabaseClient(), {
      token,
      idempotencyKey: idempotencyKeyRef.current,
    }),
  );

  return {
    status: action.status,
    data: action.data,
    error: action.error,
    cancel: action.run,
    isIdempotent: action.error?.code === "IDEMPOTENT",
  };
}
