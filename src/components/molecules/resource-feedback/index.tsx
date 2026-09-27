import styles from "./index.module.css";

type ResourceFeedbackProps = {
  kind?: "loading" | "empty" | "error" | "success";
  title: string;
  description?: string;
  onRetry?: () => void;
};

export function ResourceFeedback({
  kind = "empty",
  title,
  description,
  onRetry,
}: ResourceFeedbackProps) {
  return (
    <section className={styles.feedback} data-kind={kind} aria-live="polite">
      {kind === "loading" ? (
        <span className={styles.spinner} aria-hidden />
      ) : null}
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button className={styles.retry} onClick={onRetry} type="button">
          Tentar novamente
        </button>
      ) : null}
    </section>
  );
}
