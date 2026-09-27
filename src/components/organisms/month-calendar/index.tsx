"use client";

import { useState } from "react";
import { AppIcon } from "@/components/atoms/app-icon";
import {
  calendarDays,
  monthLabel,
  moveMonth,
  todayInTimezone,
} from "@/lib/date-time/dashboard";
import styles from "./index.module.css";

type MonthCalendarProps = {
  selectedDate: string;
  timezone: string;
  onSelect: (date: string) => void;
};

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function MonthCalendar({
  selectedDate,
  timezone,
  onSelect,
}: MonthCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    `${selectedDate.slice(0, 7)}-01`,
  );
  const today = todayInTimezone(timezone);

  return (
    <section className={styles.calendar} aria-label="Calendário">
      <header className="flex items-center justify-between gap-3">
        <button
          aria-label="Mês anterior"
          className={styles.monthButton}
          onClick={() => setVisibleMonth(moveMonth(visibleMonth, -1))}
          type="button"
        >
          <AppIcon name="chevron-left" />
        </button>
        <h2 className={styles.monthTitle}>{monthLabel(visibleMonth)}</h2>
        <button
          aria-label="Próximo mês"
          className={styles.monthButton}
          onClick={() => setVisibleMonth(moveMonth(visibleMonth, 1))}
          type="button"
        >
          <AppIcon name="chevron-right" />
        </button>
      </header>

      <div className="mt-5 grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <span className={styles.weekday} key={label}>
            {label}
          </span>
        ))}
        {calendarDays(visibleMonth).map((item) => (
          <button
            aria-label={item.date}
            aria-pressed={selectedDate === item.date}
            className={styles.day}
            data-current-month={item.currentMonth}
            data-selected={selectedDate === item.date}
            data-today={today === item.date}
            key={item.date}
            onClick={() => onSelect(item.date)}
            type="button"
          >
            {item.day}
          </button>
        ))}
      </div>
    </section>
  );
}
