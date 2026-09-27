/** @vitest-environment jsdom */

import { useEffect, useRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingFlowProvider, useBookingFlow } from "../booking-flow-provider";
import { DetailsScreen } from ".";

const push = vi.fn();
const replace = vi.fn();
const book = vi.fn();
const beginNewAttempt = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/features/booking", () => ({
  useBookAppointment: () => ({
    status: "idle",
    data: undefined,
    error: undefined,
    book,
    beginNewAttempt,
    isConflict: false,
    isIdempotent: false,
  }),
}));

function SeededDetails() {
  const flow = useBookingFlow();
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    flow.setProvider({ name: "Salão Nails", timezone: "America/Sao_Paulo" });
    flow.selectSlot({
      date: "2026-09-29",
      start: "2026-09-29T12:00:00.000Z",
      end: "2026-09-29T13:00:00.000Z",
    });
  }, [flow]);
  return flow.selectedSlot ? <DetailsScreen /> : null;
}

afterEach(cleanup);

describe("DetailsScreen", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    book.mockReset();
    beginNewAttempt.mockReset();
  });

  it("validates and confirms the booking with normalized data", async () => {
    book.mockResolvedValue({
      ok: true,
      requestId: "booking-1",
      data: {
        appointmentId: "apt-1",
        start: "2026-09-29T12:00:00.000Z",
        end: "2026-09-29T13:00:00.000Z",
        status: "CONFIRMED",
      },
    });
    render(
      <BookingFlowProvider slug="salao-nails">
        <SeededDetails />
      </BookingFlowProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Nome completo")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "  Ana   Souza " },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: " ANA@EXAMPLE.COM " },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "(11) 99999-9999" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    await waitFor(() => {
      expect(book).toHaveBeenCalledWith({
        slug: "salao-nails",
        start: "2026-09-29T12:00:00.000Z",
        end: "2026-09-29T13:00:00.000Z",
        client: {
          name: "Ana Souza",
          email: "ana@example.com",
          phone: "(11) 99999-9999",
        },
      });
      expect(replace).toHaveBeenCalledWith("/salao-nails/resumo");
    });
  });

  it("keeps the form and focuses validation feedback", async () => {
    render(
      <BookingFlowProvider slug="salao-nails">
        <SeededDetails />
      </BookingFlowProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Nome completo")).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    expect(await screen.findByText("Informe seu nome completo.")).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText("Nome completo"),
      ),
    );
    expect(book).not.toHaveBeenCalled();
  });

  it("returns direct access and booking conflicts to the schedule", async () => {
    const { unmount } = render(
      <BookingFlowProvider slug="salao-nails">
        <DetailsScreen />
      </BookingFlowProvider>,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/salao-nails/agendar"),
    );
    unmount();
    replace.mockReset();
    book.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Horário indisponível.",
        requestId: "conflict",
      },
    });
    render(
      <BookingFlowProvider slug="salao-nails">
        <SeededDetails />
      </BookingFlowProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Nome completo")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11999999999" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/salao-nails/agendar"),
    );
  });
});
