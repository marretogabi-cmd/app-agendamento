/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingFlowProvider } from "../booking-flow-provider";
import { ScheduleScreen } from ".";

const push = vi.fn();
const useBookingCalendar = vi.fn();
const useAvailability = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/features/availability", () => ({
  useBookingCalendar: (...args: unknown[]) => useBookingCalendar(...args),
  useAvailability: (...args: unknown[]) => useAvailability(...args),
}));

afterEach(cleanup);

describe("ScheduleScreen", () => {
  beforeEach(() => {
    push.mockReset();
    useBookingCalendar.mockReset();
    useAvailability.mockReset();
    useBookingCalendar.mockReturnValue({
      status: "success",
      data: {
        slug: "salao-nails",
        providerName: "Salão Nails",
        timezone: "America/Sao_Paulo",
        startDate: "2026-08-31",
        endDate: "2026-10-11",
        bookableDates: ["2026-09-29"],
      },
      error: undefined,
      refetch: vi.fn(),
    });
    useAvailability.mockImplementation((_slug: string, date: string) =>
      date
        ? {
            status: "success",
            data: {
              slug: "salao-nails",
              date,
              timezone: "America/Sao_Paulo",
              slots: [
                {
                  start: "2026-09-29T12:00:00.000Z",
                  end: "2026-09-29T13:00:00.000Z",
                },
              ],
            },
            error: undefined,
            refetch: vi.fn(),
          }
        : {
            status: "idle",
            data: undefined,
            error: undefined,
            refetch: vi.fn(),
          },
    );
  });

  it("disables unavailable dates and advances after a slot is selected", async () => {
    render(
      <BookingFlowProvider slug="salao-nails">
        <ScheduleScreen />
      </BookingFlowProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Agende com Salão Nails" }),
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { name: /29 de setembro de 2026/i }),
      ).toBeTruthy();
    });
    expect(
      (screen.getByRole("button", { name: "2026-09-28" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /09:00/i }));
    const continueButton = screen.getByRole("button", { name: "Continuar" });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(continueButton);

    expect(push).toHaveBeenCalledWith("/salao-nails/dados");
  });

  it("shows a safe not-found state", () => {
    useBookingCalendar.mockReturnValue({
      status: "error",
      data: undefined,
      error: {
        code: "NOT_FOUND",
        message: "Recurso não encontrado.",
        requestId: "not-found",
      },
      refetch: vi.fn(),
    });

    render(
      <BookingFlowProvider slug="nao-existe">
        <ScheduleScreen />
      </BookingFlowProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Agenda não encontrada" }),
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /e-mail|telefone do prestador/i,
    );
  });
});
