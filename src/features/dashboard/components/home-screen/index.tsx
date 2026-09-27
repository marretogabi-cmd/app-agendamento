"use client";

import Link from "next/link";
import { AppIcon } from "@/components/atoms/app-icon";
import { PageHeader } from "@/components/molecules/page-header";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import { useDailyAgenda } from "@/features/agenda";
import { useProfile } from "@/features/profile";
import { formatTime, todayInTimezone } from "@/lib/date-time/dashboard";
import styles from "./index.module.css";

export function HomeScreen() {
  const profile = useProfile();
  const today = profile.data ? todayInTimezone(profile.data.timezone) : "";
  const agenda = useDailyAgenda(today);
  const displayTimezone =
    agenda.data?.timezone ?? profile.data?.timezone ?? "America/Sao_Paulo";
  const booked =
    agenda.data?.slots.filter((slot) => slot.state === "booked") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Painel do dia"
        title={`Olá${profile.data?.name ? `, ${profile.data.name}` : ""}!`}
        description="Veja seus próximos atendimentos e mantenha seus horários organizados."
      />

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Ações rápidas">
        <Link className={styles.primaryAction} href="/inicio/agendamentos">
          <span className={styles.actionIcon}>
            <AppIcon name="calendar" />
          </span>
          <span>
            <strong>Gerenciar agendamentos</strong>
            <small>Consulte dias livres e ocupados</small>
          </span>
          <AppIcon name="chevron-right" />
        </Link>
        <Link className={styles.secondaryAction} href="/inicio/horarios">
          <span className={styles.actionIcon}>
            <AppIcon name="clock" />
          </span>
          <span>
            <strong>Configurar horários</strong>
            <small>Defina quando você atende</small>
          </span>
          <AppIcon name="chevron-right" />
        </Link>
      </section>

      <section aria-labelledby="today-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className={styles.sectionEyebrow}>Hoje</p>
            <h2 className={styles.sectionTitle} id="today-title">
              Agendamentos do dia
            </h2>
          </div>
          {booked.length > 0 ? (
            <span className={styles.counter}>{booked.length}</span>
          ) : null}
        </div>

        {profile.status === "pending" || agenda.status === "pending" ? (
          <ResourceFeedback kind="loading" title="Carregando sua agenda…" />
        ) : null}
        {profile.status === "error" ? (
          <ResourceFeedback
            kind="error"
            title="Não foi possível carregar seu perfil"
            description={profile.error.message}
            onRetry={profile.refetch}
          />
        ) : null}
        {agenda.status === "error" ? (
          <ResourceFeedback
            kind="error"
            title="Não foi possível carregar os agendamentos"
            description={agenda.error.message}
            onRetry={agenda.refetch}
          />
        ) : null}
        {(agenda.status === "empty" || agenda.status === "success") &&
        booked.length === 0 ? (
          <ResourceFeedback
            title="Nenhum atendimento hoje"
            description="Quando um cliente agendar, ele aparecerá aqui."
          />
        ) : null}
        {booked.length > 0 && agenda.data ? (
          <ol className="flex flex-col gap-3">
            {booked.map((slot) => (
              <li
                className={styles.appointment}
                key={slot.appointmentId ?? slot.start}
              >
                <time className={styles.appointmentTime} dateTime={slot.start}>
                  {formatTime(slot.start, displayTimezone)}
                </time>
                <span className={styles.appointmentDivider} aria-hidden />
                <span>
                  <strong className={styles.clientName}>
                    {slot.clientName ?? "Cliente"}
                  </strong>
                  <small className={styles.appointmentEnd}>
                    até {formatTime(slot.end, displayTimezone)}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
