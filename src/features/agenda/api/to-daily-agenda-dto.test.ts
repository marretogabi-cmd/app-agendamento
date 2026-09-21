import { describe, expect, it } from "vitest";
import { toDailyAgendaDto } from "./to-daily-agenda-dto";

describe("toDailyAgendaDto", () => {
  it("keeps appointmentId only on booked slots", () => {
    const dto = toDailyAgendaDto({
      date: "2026-09-15",
      slots: [
        {
          start: "2026-09-15T12:00:00.000Z",
          end: "2026-09-15T12:30:00.000Z",
          state: "available",
        },
        {
          start: "2026-09-15T12:30:00.000Z",
          end: "2026-09-15T13:00:00.000Z",
          state: "booked",
          appointmentId: "apt-1",
        },
      ],
    });

    expect(dto.slots[0]).not.toHaveProperty("appointmentId");
    expect(dto.slots[1]?.appointmentId).toBe("apt-1");
  });
});
