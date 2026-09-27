"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { BookingClientInput, BookingDto } from "@/features/booking";
import type {
  PublicBookingState,
  PublicProvider,
  SelectedBookingSlot,
} from "../../types";

type BookingFlowAction =
  | { type: "provider"; provider: PublicProvider }
  | { type: "select-slot"; slot: SelectedBookingSlot }
  | { type: "clear-selection"; notice?: string }
  | {
      type: "confirm";
      client: BookingClientInput;
      booking?: BookingDto;
    }
  | { type: "reset" };

type BookingFlowContextValue = PublicBookingState & {
  setProvider: (provider: PublicProvider) => void;
  selectSlot: (slot: SelectedBookingSlot) => void;
  clearSelection: (notice?: string) => void;
  completeBooking: (client: BookingClientInput, booking?: BookingDto) => void;
  reset: () => void;
};

const BookingFlowContext = createContext<BookingFlowContextValue | null>(null);

function reducer(
  state: PublicBookingState,
  action: BookingFlowAction,
): PublicBookingState {
  switch (action.type) {
    case "provider":
      return { ...state, provider: action.provider };
    case "select-slot":
      return {
        ...state,
        selectedSlot: action.slot,
        client: undefined,
        confirmation: undefined,
        notice: undefined,
      };
    case "clear-selection":
      return {
        ...state,
        selectedSlot: undefined,
        client: undefined,
        confirmation: undefined,
        notice: action.notice,
      };
    case "confirm": {
      if (!state.selectedSlot) return state;
      return {
        ...state,
        client: action.client,
        confirmation: action.booking ?? {
          start: state.selectedSlot.start,
          end: state.selectedSlot.end,
          status: "CONFIRMED",
        },
        notice: undefined,
      };
    }
    case "reset":
      return { slug: state.slug, provider: state.provider };
  }
}

export function BookingFlowProvider({
  children,
  slug,
}: {
  children: ReactNode;
  slug: string;
}) {
  const [state, dispatch] = useReducer(reducer, { slug });
  const setProvider = useCallback((provider: PublicProvider) => {
    dispatch({ type: "provider", provider });
  }, []);
  const selectSlot = useCallback((slot: SelectedBookingSlot) => {
    dispatch({ type: "select-slot", slot });
  }, []);
  const clearSelection = useCallback((notice?: string) => {
    dispatch({ type: "clear-selection", notice });
  }, []);
  const completeBooking = useCallback(
    (client: BookingClientInput, booking?: BookingDto) => {
      dispatch({ type: "confirm", client, booking });
    },
    [],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const value = useMemo(
    () => ({
      ...state,
      setProvider,
      selectSlot,
      clearSelection,
      completeBooking,
      reset,
    }),
    [state, setProvider, selectSlot, clearSelection, completeBooking, reset],
  );

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}

export function useBookingFlow(): BookingFlowContextValue {
  const context = useContext(BookingFlowContext);
  if (!context) {
    throw new Error("useBookingFlow must be used inside BookingFlowProvider");
  }
  return context;
}
