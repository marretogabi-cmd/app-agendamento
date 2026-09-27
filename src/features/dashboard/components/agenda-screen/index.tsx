"use client";

import { useState } from "react";
import { MonthCalendar } from "@/components/organisms/month-calendar";
import { PageHeader } from "@/components/molecules/page-header";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import { useDailyAgenda, type AgendaSlotState } from "@/features/agenda";
import {
  formatLongDate,
  formatTime,
  todayInTimezone,
} from "@/lib/date-time/dashboard";
import styles from "./index.module.css";

const statusLabel: Record<AgendaSlotState, string> = {
  available: "Livre",
  booked: "Ocupado",
  blocked: "Bloqueado",
};

export function AgendaScreen({ timezone }: { timezone: string }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    todayInTimezone(timezone),
  );
  const agenda = useDailyAgenda(selectedDate);
  const displayTimezone = agenda.data?.timezone ?? timezone;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Sua agenda"
        title="Agendamentos"
        description="Escolha um dia para consultar os horários livres, ocupados e bloqueados."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(19rem,23rem)_1fr]">
        <MonthCalendar
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          timezone={timezone}
        />

        <section aria-labelledby="selected-date-title">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={styles.sectionEyebrow}>Horários</p>
              <h2 className={styles.sectionTitle} id="selected-date-title">
                {formatLongDate(selectedDate)}
              </h2>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label="Legenda">
              {Object.entries(statusLabel).map(([state, label]) => (
                <li className={styles.legend} data-state={state} key={state}>
                  <span aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </header>

          {agenda.status === "pending" ? (
            <ResourceFeedback kind="loading" title="Buscando horários…" />
          ) : null}
          {agenda.status === "error" ? (
            <ResourceFeedback
              kind="error"
              title="Não foi possível consultar esse dia"
              description={agenda.error.message}
              onRetry={agenda.refetch}
            />
          ) : null}
          {agenda.status === "empty" ? (
            <ResourceFeedback
              title="Nenhum horário nesse dia"
              description="Confira outro dia ou configure seus horários de atendimento."
            />
          ) : null}
          {agenda.status === "success" ? (
            <ol className="flex flex-col gap-2">
              {agenda.data.slots.map((slot) => (
                <li
                  className={styles.slot}
                  data-state={slot.state}
                  key={`${slot.state}-${slot.start}-${slot.appointmentId ?? "slot"}`}
                >
                  <span className={styles.statusBar} aria-hidden />
                  <time className={styles.time} dateTime={slot.start}>
                    {formatTime(slot.start, displayTimezone)}
                    <small>– {formatTime(slot.end, displayTimezone)}</small>
                  </time>
                  <span className={styles.slotInfo}>
                    <strong>{statusLabel[slot.state]}</strong>
                    {slot.state === "booked" ? (
                      <small>{slot.clientName ?? "Cliente agendado"}</small>
                    ) : slot.state === "available" ? (
                      <small>Disponível para agendamento</small>
                    ) : (
                      <small>Indisponível para clientes</small>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </div>
    </div>
  );
}
