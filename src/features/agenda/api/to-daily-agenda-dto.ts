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

  return next;
}

export function toDailyAgendaDto(data: DailyAgendaDto): DailyAgendaDto {
  return {
    date: data.date,
    slots: data.slots.map(toAgendaSlot),
  };
}
