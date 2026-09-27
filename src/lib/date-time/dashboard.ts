import { Temporal } from "@js-temporal/polyfill";

export function todayInTimezone(timezone: string): string {
  return Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString();
}

export function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatLongDate(date: string): string {
  const plain = Temporal.PlainDate.from(date);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${plain.toString()}T12:00:00Z`));
}

export function monthLabel(date: string): string {
  const plain = Temporal.PlainDate.from(date);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${plain.with({ day: 1 }).toString()}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function moveMonth(date: string, amount: number): string {
  return Temporal.PlainDate.from(date)
    .with({ day: 1 })
    .add({ months: amount })
    .toString();
}

export type CalendarDay = {
  date: string;
  day: number;
  currentMonth: boolean;
};

export function calendarDays(monthDate: string): CalendarDay[] {
  const month = Temporal.PlainDate.from(monthDate).with({ day: 1 });
  const first = month.subtract({ days: month.dayOfWeek - 1 });
  return Array.from({ length: 42 }, (_, index) => {
    const date = first.add({ days: index });
    return {
      date: date.toString(),
      day: date.day,
      currentMonth: date.month === month.month && date.year === month.year,
    };
  });
}
