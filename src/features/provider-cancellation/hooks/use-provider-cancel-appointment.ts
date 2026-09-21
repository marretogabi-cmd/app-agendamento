"use client";

import { useRef } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cancelAppointmentAsProvider } from "../api/cancel-appointment-as-provider";

export function useProviderCancelAppointment() {
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const action = useAsyncAction((appointmentId: string) =>
    cancelAppointmentAsProvider(createBrowserSupabaseClient(), {
      appointmentId,
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
