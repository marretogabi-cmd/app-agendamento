export type BookingClientInput = {
  name: string;
  email: string;
  phone: string;
};

export type BookAppointmentInput = {
  slug: string;
  start: string;
  end: string;
  client: BookingClientInput;
  idempotencyKey: string;
};

export type BookingDto = {
  appointmentId: string;
  start: string;
  end: string;
  status: "CONFIRMED";
};
