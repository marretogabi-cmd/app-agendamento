"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthCalendar } from "@/components/organisms/month-calendar";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import {
  useAvailability,
  useBookingCalendar,
  type TimeSlot,
} from "@/features/availability";
import {
  calendarDays,
  formatLongDate,
  formatTime,
  todayInTimezone,
} from "@/lib/date-time/dashboard";
import { useBookingFlow } from "../booking-flow-provider";
import styles from "./index.module.css";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function bookingPath(slug: string, step: "agendar" | "dados") {
  return `/${encodeURIComponent(slug)}/${step}`;
}

export function ScheduleScreen() {
  const router = useRouter();
  const {
    slug,
    provider,
    selectedSlot,
    notice,
    setProvider,
    selectSlot,
    clearSelection,
  } = useBookingFlow();
  const initialDate = todayInTimezone(DEFAULT_TIMEZONE);
  const [visibleMonth, setVisibleMonth] = useState(
    `${initialDate.slice(0, 7)}-01`,
  );
  const [selectedDate, setSelectedDate] = useState(selectedSlot?.date ?? "");
  const visibleDays = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const startDate = visibleDays[0]?.date ?? "";
  const endDate = visibleDays.at(-1)?.date ?? "";
  const calendar = useBookingCalendar(slug, startDate, endDate);
  const timezone =
    calendar.data?.timezone ?? provider?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayInTimezone(timezone);
  const bookableDates = useMemo(
    () => new Set(calendar.data?.bookableDates ?? []),
    [calendar.data?.bookableDates],
  );
  const disabledDates = useMemo(
    () =>
      new Set(
        visibleDays
          .filter((day) => day.date < today || !bookableDates.has(day.date))
          .map((day) => day.date),
      ),
    [bookableDates, today, visibleDays],
  );
  const availability = useAvailability(slug, selectedDate);

  useEffect(() => {
    if (!calendar.data) return;

    setProvider({
      name: calendar.data.providerName,
      timezone: calendar.data.timezone,
    });
    const availableInMonth = calendar.data.bookableDates.filter(
      (date) => date >= today && date.startsWith(visibleMonth.slice(0, 7)),
    );
    if (selectedDate && availableInMonth.includes(selectedDate)) return;

    // A resposta remota define a primeira data realmente reservável.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDate(availableInMonth[0] ?? "");
  }, [calendar.data, selectedDate, setProvider, today, visibleMonth]);

  function handleMonthChange(month: string) {
    setVisibleMonth(month);
    setSelectedDate("");
    clearSelection();
  }

  function handleDateSelect(date: string) {
    if (date !== selectedDate) clearSelection();
    setSelectedDate(date);
  }

  function handleSlotSelect(slot: TimeSlot) {
    selectSlot({ date: selectedDate, start: slot.start, end: slot.end });
  }

  if (calendar.status === "error" && calendar.error.code === "NOT_FOUND") {
    return (
      <section className={styles.narrow} aria-labelledby="schedule-title">
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Agendamento online</p>
          <h1 id="schedule-title">Agenda não encontrada</h1>
          <p>Confira se o link recebido está completo e tente novamente.</p>
        </header>
        <ResourceFeedback
          kind="error"
          title="Este link não está disponível"
          description="Peça ao prestador um novo link de agendamento."
          onRetry={calendar.refetch}
        />
      </section>
    );
  }

  const providerName = calendar.data?.providerName ?? provider?.name;
  const selectedSlotIsCurrent =
    selectedSlot?.date === selectedDate &&
    availability.data?.slots.some(
      (slot) =>
        slot.start === selectedSlot.start && slot.end === selectedSlot.end,
    );

  return (
    <section aria-labelledby="schedule-title">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Agendamento online</p>
        <h1 id="schedule-title">
          {providerName ? `Agende com ${providerName}` : "Escolha seu horário"}
        </h1>
        <p>Selecione uma data disponível e o melhor horário para você.</p>
      </header>

      {notice ? (
        <div className={styles.notice} role="alert">
          {notice}
        </div>
      ) : null}

      {calendar.status === "error" ? (
        <ResourceFeedback
          kind="error"
          title="Não foi possível carregar esta agenda"
          description={calendar.error.message}
          onRetry={calendar.refetch}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(19rem,23rem)_1fr]">
          <section
            aria-label="Escolha uma data"
            aria-busy={calendar.status === "pending"}
          >
            <MonthCalendar
              disabledDates={disabledDates}
              disableOutsideMonth
              onSelect={handleDateSelect}
              onVisibleMonthChange={handleMonthChange}
              selectedDate={selectedDate}
              timezone={timezone}
              visibleMonth={visibleMonth}
            />
            <p className={styles.calendarHint}>
              Dias riscados não possuem horários disponíveis.
            </p>
          </section>

          <section className={styles.timesPanel} aria-labelledby="times-title">
            <header className={styles.timesHeader}>
              <p className={styles.eyebrow}>Horários disponíveis</p>
              <h2 id="times-title">
                {selectedDate
                  ? formatLongDate(selectedDate)
                  : "Escolha uma data"}
              </h2>
            </header>

            {calendar.status === "pending" ? (
              <ResourceFeedback kind="loading" title="Carregando a agenda…" />
            ) : null}
            {calendar.status === "empty" ? (
              <ResourceFeedback
                title="Nenhum horário neste mês"
                description="Use as setas do calendário para consultar os próximos meses."
              />
            ) : null}
            {calendar.status === "success" && !selectedDate ? (
              <ResourceFeedback
                title="Nenhuma data disponível"
                description="Escolha outro mês para continuar."
              />
            ) : null}
            {selectedDate && availability.status === "pending" ? (
              <ResourceFeedback kind="loading" title="Buscando horários…" />
            ) : null}
            {selectedDate && availability.status === "error" ? (
              <ResourceFeedback
                kind="error"
                title="Não foi possível consultar este dia"
                description={availability.error.message}
                onRetry={availability.refetch}
              />
            ) : null}
            {selectedDate && availability.status === "empty" ? (
              <ResourceFeedback
                title="Os horários deste dia acabaram"
                description="Escolha outra data disponível no calendário."
              />
            ) : null}
            {selectedDate && availability.status === "success" ? (
              <fieldset>
                <legend className="sr-only">Escolha um horário</legend>
                <div className={styles.slotGrid}>
                  {availability.data.slots.map((slot) => {
                    const selected =
                      selectedSlot?.start === slot.start &&
                      selectedSlot?.end === slot.end;
                    return (
                      <button
                        aria-pressed={selected}
                        className={styles.slot}
                        data-selected={selected}
                        key={slot.start}
                        onClick={() => handleSlotSelect(slot)}
                        type="button"
                      >
                        <strong>{formatTime(slot.start, timezone)}</strong>
                        <span>até {formatTime(slot.end, timezone)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <div className={styles.actions}>
              <button
                className="btn btn-primary btn-block sm:btn-wide"
                disabled={!selectedSlotIsCurrent}
                onClick={() => router.push(bookingPath(slug, "dados"))}
                type="button"
              >
                Continuar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
