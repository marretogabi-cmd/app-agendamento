/** @vitest-environment jsdom */

import { useEffect } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingFlowProvider, useBookingFlow } from "../booking-flow-provider";
import { SummaryScreen } from ".";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function SeededSummary() {
  const flow = useBookingFlow();
  useEffect(() => {
    if (!flow.selectedSlot) {
      flow.setProvider({ name: "Salão Nails", timezone: "America/Sao_Paulo" });
      flow.selectSlot({
        date: "2026-09-29",
        start: "2026-09-29T12:00:00.000Z",
        end: "2026-09-29T13:00:00.000Z",
      });
      return;
    }
    if (!flow.confirmation) {
      flow.completeBooking(
        {
          name: "Ana Souza",
          email: "ana@example.com",
          phone: "(11) 99999-9999",
        },
        {
          appointmentId: "apt-1",
          start: flow.selectedSlot.start,
          end: flow.selectedSlot.end,
          status: "CONFIRMED",
        },
      );
    }
  }, [flow]);
  return flow.confirmation ? <SummaryScreen /> : null;
}

afterEach(cleanup);

describe("SummaryScreen", () => {
  beforeEach(() => replace.mockReset());

  it("shows the confirmed summary and starts a fresh flow", async () => {
    render(
      <BookingFlowProvider slug="salao-nails">
        <SeededSummary />
      </BookingFlowProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Agendamento confirmado!" }),
      ).toBeTruthy();
    });
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    expect(document.body.textContent).toContain("opção de cancelamento");

    fireEvent.click(
      screen.getByRole("button", { name: "Fazer novo agendamento" }),
    );
    expect(replace).toHaveBeenCalledWith("/salao-nails/agendar");
  });

  it("guards a direct visit without a confirmed booking", async () => {
    render(
      <BookingFlowProvider slug="salao-nails">
        <SummaryScreen />
      </BookingFlowProvider>,
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/salao-nails/agendar"),
    );
  });
});
