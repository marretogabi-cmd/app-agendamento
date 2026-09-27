import type { BookingClientInput, BookingDto } from "@/features/booking";

export type PublicProvider = {
  name: string;
  timezone: string;
};

export type SelectedBookingSlot = {
  date: string;
  start: string;
  end: string;
};

export type BookingConfirmation = Omit<BookingDto, "appointmentId"> & {
  appointmentId?: string;
};

export type PublicBookingState = {
  slug: string;
  provider?: PublicProvider;
  selectedSlot?: SelectedBookingSlot;
  client?: BookingClientInput;
  confirmation?: BookingConfirmation;
  notice?: string;
};
