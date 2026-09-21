"use client";

import { useRef } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { bookAppointment } from "../api/book-appointment";
import type { BookAppointmentInput } from "../types";

type BookAppointmentForm = Omit<BookAppointmentInput, "idempotencyKey">;

export function useBookAppointment() {
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const action = useAsyncAction((input: BookAppointmentForm) =>
    bookAppointment(createBrowserSupabaseClient(), {
      ...input,
      idempotencyKey: idempotencyKeyRef.current,
    }),
  );

  const beginNewAttempt = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
    action.reset();
  };

  return {
    status: action.status,
    data: action.data,
    error: action.error,
    book: action.run,
    beginNewAttempt,
    isConflict: action.error?.code === "CONFLICT",
    isIdempotent: action.error?.code === "IDEMPOTENT",
  };
}
