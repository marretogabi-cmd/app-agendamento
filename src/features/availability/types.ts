export type TimeSlot = {
  start: string;
  end: string;
};

export type AvailabilityQuery = {
  slug: string;
  date: string;
};

export type AvailabilityDto = {
  slug: string;
  date: string;
  timezone: string;
  slots: TimeSlot[];
};

export type BookingCalendarQuery = {
  slug: string;
  startDate: string;
  endDate: string;
};

export type BookingCalendarDto = BookingCalendarQuery & {
  providerName: string;
  timezone: string;
  bookableDates: string[];
};
