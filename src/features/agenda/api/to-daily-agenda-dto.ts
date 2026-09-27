import type { AgendaSlot, DailyAgendaDto } from "../types";

export function toAgendaSlot(slot: AgendaSlot): AgendaSlot {
  const next: AgendaSlot = {
    start: slot.start,
    end: slot.end,
    state: slot.state,
  };

  if (slot.appointmentId) {
    next.appointmentId = slot.appointmentId;
  }
  if (slot.state === "booked" && slot.clientName) {
    next.clientName = slot.clientName;
  }

  return next;
}

export function toDailyAgendaDto(data: DailyAgendaDto): DailyAgendaDto {
  return {
    date: data.date,
    timezone: data.timezone,
    slots: data.slots.map(toAgendaSlot),
  };
}
