export type CancellationPreviewDto = {
  appointmentId: string;
  start: string;
  end: string;
  status: "CONFIRMED" | "CANCELLED";
  providerName: string;
};

export type CancelAppointmentDto = {
  appointmentId: string;
  status: "CANCELLED";
};
