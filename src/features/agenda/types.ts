export type AgendaSlotState = "available" | "booked" | "blocked";

export type AgendaSlot = {
  start: string;
  end: string;
  state: AgendaSlotState;
  appointmentId?: string;
};

export type DailyAgendaDto = {
  date: string;
  slots: AgendaSlot[];
};
