"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import {
  useBookAppointment,
  type BookingClientInput,
} from "@/features/booking";
import { AppointmentSummary } from "../appointment-summary";
import { useBookingFlow } from "../booking-flow-provider";
import {
  type ClientField,
  type ClientFieldErrors,
  validateBookingClient,
} from "./index.function";
import styles from "./index.module.css";

function bookingPath(slug: string, step: "agendar" | "resumo") {
  return `/${encodeURIComponent(slug)}/${step}`;
}

function firstFieldWithError(
  errors: ClientFieldErrors,
): ClientField | undefined {
  return (Object.keys(errors) as ClientField[])[0];
}

export function DetailsScreen() {
  const router = useRouter();
  const flow = useBookingFlow();
  const booking = useBookAppointment();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<BookingClientInput>(
    flow.client ?? { name: "", email: "", phone: "" },
  );
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (!flow.selectedSlot) {
      router.replace(bookingPath(flow.slug, "agendar"));
    }
  }, [flow.selectedSlot, flow.slug, router]);

  function updateField(field: ClientField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(undefined);
  }

  function focusField(field: ClientField | undefined) {
    if (!field) return;
    requestAnimationFrame(() => {
      document.getElementById(`booking-${field}`)?.focus();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flow.selectedSlot || booking.status === "pending") return;

    const validation = validateBookingClient(values);
    setFieldErrors(validation.errors);
    setSubmitError(undefined);
    if (!validation.data) {
      focusField(firstFieldWithError(validation.errors));
      return;
    }

    const result = await booking.book({
      slug: flow.slug,
      start: flow.selectedSlot.start,
      end: flow.selectedSlot.end,
      client: validation.data,
    });

    if (result.ok) {
      flow.completeBooking(validation.data, result.data);
      router.replace(bookingPath(flow.slug, "resumo"));
      return;
    }
    if (result.error.code === "IDEMPOTENT") {
      flow.completeBooking(validation.data);
      router.replace(bookingPath(flow.slug, "resumo"));
      return;
    }
    if (result.error.code === "CONFLICT") {
      flow.clearSelection(
        "Este horário acabou de ficar indisponível. Escolha uma nova opção.",
      );
      router.replace(bookingPath(flow.slug, "agendar"));
      return;
    }

    const apiFieldErrors: ClientFieldErrors = {};
    for (const field of ["name", "email", "phone"] as const) {
      const message = result.error.fieldErrors?.[field]?.[0];
      if (message) apiFieldErrors[field] = message;
    }
    setFieldErrors(apiFieldErrors);
    setSubmitError(result.error.message);
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  if (!flow.selectedSlot) {
    return (
      <div className={styles.narrow}>
        <ResourceFeedback kind="loading" title="Voltando para a agenda…" />
      </div>
    );
  }

  const providerName = flow.provider?.name ?? "Prestador";
  const timezone = flow.provider?.timezone ?? "America/Sao_Paulo";
  const busy = booking.status === "pending";

  return (
    <section className={styles.narrow} aria-labelledby="details-title">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Quase lá</p>
        <h1 id="details-title">Seus dados</h1>
        <p>Precisamos destas informações para confirmar o agendamento.</p>
      </header>

      <AppointmentSummary
        providerName={providerName}
        slot={flow.selectedSlot}
        timezone={timezone}
      />

      <form className={styles.formCard} noValidate onSubmit={handleSubmit}>
        <header>
          <h2>Dados pessoais</h2>
          <p>Todos os campos são obrigatórios.</p>
        </header>

        {submitError ? (
          <div
            className={styles.errorSummary}
            ref={errorSummaryRef}
            role="alert"
            tabIndex={-1}
          >
            <strong>Não foi possível confirmar</strong>
            <span>{submitError}</span>
          </div>
        ) : null}

        <div className="grid gap-4">
          <fieldset className="fieldset">
            <label className="fieldset-legend" htmlFor="booking-name">
              Nome completo
            </label>
            <input
              aria-describedby={
                fieldErrors.name ? "booking-name-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="name"
              className="input input-bordered w-full"
              disabled={busy}
              id="booking-name"
              maxLength={120}
              name="name"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Como devemos chamar você?"
              required
              type="text"
              value={values.name}
            />
            {fieldErrors.name ? (
              <p className={styles.fieldError} id="booking-name-error">
                {fieldErrors.name}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-legend" htmlFor="booking-email">
              E-mail
            </label>
            <input
              aria-describedby={
                fieldErrors.email ? "booking-email-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              className="input input-bordered w-full"
              disabled={busy}
              id="booking-email"
              maxLength={254}
              name="email"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={values.email}
            />
            {fieldErrors.email ? (
              <p className={styles.fieldError} id="booking-email-error">
                {fieldErrors.email}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="fieldset">
            <label className="fieldset-legend" htmlFor="booking-phone">
              Telefone
            </label>
            <input
              aria-describedby={
                fieldErrors.phone ? "booking-phone-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.phone)}
              autoComplete="tel"
              className="input input-bordered w-full"
              disabled={busy}
              id="booking-phone"
              inputMode="tel"
              maxLength={30}
              name="phone"
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="(11) 99999-9999"
              required
              type="tel"
              value={values.phone}
            />
            {fieldErrors.phone ? (
              <p className={styles.fieldError} id="booking-phone-error">
                {fieldErrors.phone}
              </p>
            ) : null}
          </fieldset>
        </div>

        <div className={styles.actions}>
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => router.push(bookingPath(flow.slug, "agendar"))}
            type="button"
          >
            Voltar
          </button>
          <button
            aria-busy={busy}
            className="btn btn-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <span className="loading loading-spinner" aria-hidden="true" />
            ) : null}
            Confirmar agendamento
          </button>
        </div>
      </form>
    </section>
  );
}
