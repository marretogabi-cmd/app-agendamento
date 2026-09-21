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
