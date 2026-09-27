// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/profile", () => ({
  useProfile: () => ({
    status: "success",
    data: {
      id: "provider-1",
      name: "Ana",
      publicSlug: "ana-servicos",
      phone: "11999999999",
      timezone: "America/Sao_Paulo",
      updatedAt: "2026-09-26T12:00:00.000Z",
    },
    error: undefined,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/agenda", () => ({
  useDailyAgenda: () => ({
    status: "success",
    data: {
      date: "2026-09-26",
      timezone: "America/Sao_Paulo",
      slots: [
        {
          start: "2026-09-26T12:00:00.000Z",
          end: "2026-09-26T13:00:00.000Z",
          state: "booked",
          appointmentId: "appointment-1",
          clientName: "Bruno",
        },
      ],
    },
    error: undefined,
    refetch: vi.fn(),
  }),
}));

import { HomeScreen } from ".";

afterEach(cleanup);

describe("HomeScreen", () => {
  it("shows the greeting, daily customer and quick actions", () => {
    render(<HomeScreen />);

    expect(screen.getByRole("heading", { name: "Olá, Ana!" })).toBeTruthy();
    expect(screen.getByText("Bruno")).toBeTruthy();
    expect(screen.getByText("09:00")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Gerenciar agendamentos/ })
        .getAttribute("href"),
    ).toBe("/inicio/agendamentos");
    expect(
      screen
        .getByRole("link", { name: /Configurar horários/ })
        .getAttribute("href"),
    ).toBe("/inicio/horarios");
  });
});
