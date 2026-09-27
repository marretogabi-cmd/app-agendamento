// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonthCalendar } from ".";

afterEach(cleanup);

describe("MonthCalendar", () => {
  it("opens on the selected month and reports a selected date", () => {
    const onSelect = vi.fn();
    render(
      <MonthCalendar
        onSelect={onSelect}
        selectedDate="2026-09-15"
        timezone="America/Sao_Paulo"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Setembro de 2026" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "2026-09-15" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "2026-09-21" }));
    expect(onSelect).toHaveBeenCalledWith("2026-09-21");
  });

  it("navigates between months", () => {
    render(
      <MonthCalendar
        onSelect={vi.fn()}
        selectedDate="2026-12-15"
        timezone="America/Sao_Paulo"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(
      screen.getByRole("heading", { name: "Janeiro de 2027" }),
    ).toBeTruthy();
  });

  it("disables unavailable dates and reports controlled month changes", () => {
    const onVisibleMonthChange = vi.fn();
    render(
      <MonthCalendar
        disableOutsideMonth
        disabledDates={new Set(["2026-09-15"])}
        onSelect={vi.fn()}
        onVisibleMonthChange={onVisibleMonthChange}
        selectedDate=""
        timezone="America/Sao_Paulo"
        visibleMonth="2026-09-01"
      />,
    );

    expect(
      (screen.getByRole("button", { name: "2026-09-15" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(onVisibleMonthChange).toHaveBeenCalledWith("2026-10-01");
  });
});
