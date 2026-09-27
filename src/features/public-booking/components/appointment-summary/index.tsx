import { formatLongDate, formatTime } from "@/lib/date-time/dashboard";
import type { SelectedBookingSlot } from "../../types";
import styles from "./index.module.css";

export function AppointmentSummary({
  providerName,
  slot,
  timezone,
}: {
  providerName: string;
  slot: SelectedBookingSlot;
  timezone: string;
}) {
  return (
    <article
      className={styles.card}
      aria-labelledby="appointment-summary-title"
    >
      <p className={styles.eyebrow}>Seu horário</p>
      <h2 className={styles.title} id="appointment-summary-title">
        {providerName}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt>Data</dt>
          <dd>{formatLongDate(slot.date)}</dd>
        </div>
        <div>
          <dt>Horário</dt>
          <dd>
            {formatTime(slot.start, timezone)} às{" "}
            {formatTime(slot.end, timezone)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
