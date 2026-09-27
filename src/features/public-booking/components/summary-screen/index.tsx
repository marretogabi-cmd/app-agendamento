"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import { AppointmentSummary } from "../appointment-summary";
import { useBookingFlow } from "../booking-flow-provider";
import styles from "./index.module.css";

function bookingPath(slug: string, step: "agendar") {
  return `/${encodeURIComponent(slug)}/${step}`;
}

export function SummaryScreen() {
  const router = useRouter();
  const flow = useBookingFlow();
  const ready = Boolean(
    flow.selectedSlot && flow.client && flow.confirmation && flow.provider,
  );

  useEffect(() => {
    if (!ready) router.replace(bookingPath(flow.slug, "agendar"));
  }, [flow.slug, ready, router]);

  if (!ready || !flow.selectedSlot || !flow.client || !flow.provider) {
    return (
      <div className={styles.narrow}>
        <ResourceFeedback kind="loading" title="Voltando para a agenda…" />
      </div>
    );
  }

  function startAgain() {
    flow.reset();
    router.replace(bookingPath(flow.slug, "agendar"));
  }

  return (
    <section className={styles.narrow} aria-labelledby="summary-title">
      <header className={styles.successHeader}>
        <span className={styles.successIcon} aria-hidden="true">
          ✓
        </span>
        <p className={styles.eyebrow}>Tudo certo</p>
        <h1 id="summary-title">Agendamento confirmado!</h1>
        <p>Seu horário foi reservado com sucesso.</p>
      </header>

      <AppointmentSummary
        providerName={flow.provider.name}
        slot={flow.selectedSlot}
        timezone={flow.provider.timezone}
      />

      <article className={styles.personalCard} aria-labelledby="personal-title">
        <h2 id="personal-title">Dados pessoais</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt>Nome</dt>
            <dd>{flow.client.name}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{flow.client.email}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{flow.client.phone}</dd>
          </div>
        </dl>
      </article>

      <aside
        className={styles.emailNotice}
        aria-labelledby="email-notice-title"
      >
        <span className={styles.mailIcon} aria-hidden="true">
          @
        </span>
        <div>
          <h2 id="email-notice-title">Confira seu e-mail</h2>
          <p>
            Enviaremos um resumo do agendamento. Se precisar cancelar, use a
            opção de cancelamento disponível nesse e-mail.
          </p>
        </div>
      </aside>

      <div className={styles.actions}>
        <button
          className="btn btn-outline btn-primary"
          onClick={startAgain}
          type="button"
        >
          Fazer novo agendamento
        </button>
      </div>
    </section>
  );
}
